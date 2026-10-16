import { Injectable } from '@nestjs/common';
import {
    DataSource, EntityManager,
    EntityMetadata,
    SelectQueryBuilder
} from "typeorm";
import {RelationMetadata} from "typeorm/metadata/RelationMetadata.js";
import {EntityMetadataService} from "../entity-metadata/entity-metadata.service.js";
import {Assoc, Entity} from "../common/EntityMetadata.js";
import {User} from "../modules/administration/user.entity.js";
import {Utils} from "../utils/Utils.js";
import {FindParamRowsForAssoc} from "./FindParamRowsForAssoc.js";
import {SaveRowParam} from "./SaveRowParam.js";
import {RemoveRowParam} from "./RemoveRowParam.js";
import * as bcrypt from 'bcrypt';
import {PostLoginRequest, PostLoginResponse} from "../common/auth-api.js";
import {Auth, EnvVar} from "../env-vars/EnvVars.js";
import {join} from "path";
import {unlinkSync} from "fs";
import {RowIdListToRemove} from "./RowIdListToRemove.js";
import {Parameter} from "../modules/administration/parameter.entity.js";
import {dateFromModel, dateFromUI, datetimeAsUI, intFromUI, numberFromModel} from "../common/UtilsConversions.js";
import {LocalAuthService} from "../auth/local-auth.service.js";
import {UnlockRowRequest} from "../common/lib-api.js";
import {AppError} from "../utils/AppError.js";
import {localeOption} from "../locale/Locale.js";

@Injectable()
export class PersistenceService {

    constructor(
        private readonly dataSource: DataSource,
        private readonly entityMetadataService: EntityMetadataService,
        private readonly localAuthService: LocalAuthService
    ) {}

    /**
     * @deprecated - use LazyDataTableService.findRows
     */
    async findRowsForAssoc(findParamRows : FindParamRowsForAssoc): Promise<any[]> {
        const repository = this.dataSource.getRepository(findParamRows.entity);
        const entityMetadata: EntityMetadata = repository.metadata
        const relationMetadata: RelationMetadata = entityMetadata.findRelationWithPropertyPath(findParamRows.assocField);
        if (relationMetadata === undefined) {
            throw "Unexpected error - RelationMetadata for property " + findParamRows.assocField + " not found for entity " + findParamRows.entity;
        }
        const repositoryForAssoc = this.dataSource.getRepository(relationMetadata.type);
        const selectQueryBuilder : SelectQueryBuilder<unknown> = repositoryForAssoc.createQueryBuilder("t0");
        if (findParamRows.displayField !== undefined && findParamRows.displayField !== null && findParamRows.filter !== undefined && findParamRows.filter !== null) {
            selectQueryBuilder.where("t0." + findParamRows.displayField + " LIKE :filter", {filter: findParamRows.filter + "%"});
        }

        const rows: any[] = await selectQueryBuilder.getMany();
        return rows;
    }

    async saveRow(row: SaveRowParam): Promise<any> {
        // we put all db operations into one transaction
        const fileListToRemove: Array<string> = new Array<string>();
        const objectReloaded: any = await this.dataSource.transaction<any>(manager => this.saveRowInTransaction(manager, row, fileListToRemove));
        // the transaction was committed, we delete possible files
        // (if we deleted before the commit and the commit did not go through, an inconsistency would arise; if deleting a file does not go through it is not such a tragedy)
        this.removeFiles(fileListToRemove);
        return objectReloaded;
    }

    async saveRowInTransaction(manager: EntityManager, row: SaveRowParam, fileListToRemove?: Array<string>): Promise<any> {

        // first unlock the row if the entity uses pessimistic locking (lockDate !== null)
        await this.unlockRowForSave(manager, row.entity, row.object);

        // saveRow is also used for insert (the id is undefined, TypeORM does an insert directly)
        // and also for update (the id is a number, TypeORM first finds out through a select whether the given record exists)

        // note: if detail records are also to be written when save(<master>) is called,
        // this has to be written on the OneToMany association: {cascade: ["insert", "update", "remove"]}
        // ("remove" is not needed but we apply that one on our custom removeRow)

        // note 2: on the association options I found the attribute orphanedRowAction
        // it is likely that this attribute does the "orphan removal" that we programmed,
        // it should be specified on the ManyToOne association (https://john-hu.medium.com/typeorm-deletes-one-to-many-orphans-a7404f922895)

        const xEntity: Entity = this.entityMetadataService.getEntity(row.entity);

        // if we have a generated id, we change it to undefined (so that we have a direct insert and a correct id)
        if (row.object.__x_generatedRowId) {
            row.object[xEntity.idField] = undefined;
            delete row.object.__x_generatedRowId; // in case we return the object to the client (reload === true), we do not want __x_generatedRowId there
        }

        const assocOneToManyList: Assoc[] = this.entityMetadataService.getAssocList(xEntity, ["one-to-many"]);
        const rowId = row.object[xEntity.idField];
        const insert: boolean = (rowId === undefined);
        const assocOneToManyWithoutCascadeList: Assoc[] = assocOneToManyList.filter(insert ? (assoc: Assoc) => !(assoc.isCascadeInsert) : (assoc: Assoc) => !(assoc.isCascadeUpdate));
        const assocOneToManyWithCascadeList: Assoc[] = assocOneToManyList.filter(insert ? (assoc: Assoc) => assoc.isCascadeInsert : (assoc: Assoc) => assoc.isCascadeUpdate);

        // by default, TypeORM changes the rows of the child table of @OneToMany assoc (e.g. sets FK column to null)
        // - TypeORM saves the associated rows into DB even if cascade is not used (similar like by @ManyToOne associations)
        // (adding cascade causes that also the values of attributes of the child rows are saved)
        // unintended saving @OneToMany associations caused problem if child entity was saved separately (main entity sometimes overwrited the FK column of child entity)
        // (we also save some selects :-)

        // warning: cleaning @OneToMany assoc can cause problem by reload row (returning inserted/updated row from dialog of the autocomplete component),
        // the @OneToMany assoc of the returned row will be undefined and if the assoc is used in autocomplete, then we have a problem (but it is very rare case)
        for (const assoc of assocOneToManyWithoutCascadeList) {
            row.object[assoc.name] = undefined;
        }

        for (const assoc of assocOneToManyWithCascadeList) {
            const xChildEntity: Entity = this.entityMetadataService.getEntity(assoc.entityName);

            // adjustment of what came from the client - we null out artificially created ids
            // (we do it here and not on the client, because if the save does not go through, the form stays open)
            // (note: it could also be done during serialization)
            const childRowList = row.object[assoc.name];

            // if we do not have childRowList loaded, we do not touch the association - we do not make any changes on it
            if (childRowList === undefined) {
                continue; // we go to the next association
            }

            for (const childRow of childRowList) {
                if (childRow.__x_generatedRowId) {
                    // undefined in the id causes INSERT to be executed directly
                    // (it is not tested whether the record already exists in the DB (as is the case with null or another numeric value))
                    // the cascade insert/update then works nicely
                    childRow[xChildEntity.idField] = undefined;
                    delete childRow.__x_generatedRowId; // in case we return the object to the client (reload === true), we do not want __x_generatedRowId there
                }
            }
        }

        // if we have an update
        if (!insert) {
            // because we are missing "remove orphaned entities" on associations with details, for now we have to program it manually
            // it is probably the same whether before save or after save (if after save, cascade "remove" must be turned off - it does not work but this remove runs sooner)
            for (const assoc of assocOneToManyWithCascadeList) {
                const xChildEntity: Entity = this.entityMetadataService.getEntity(assoc.entityName);

                const idList: any[] = [];
                const childRowList = row.object[assoc.name];

                // if we do not have childRowList loaded, we do not touch the association - we do not make any changes on it
                // (if someone expects that records on the association will be deleted in such a case, they should set the oneToMany attribute to an empty list - assign object.<assoc> = [])
                if (childRowList === undefined) {
                    continue; // we go to the next association
                }

                for (const childRow of childRowList) {
                    const id = childRow[xChildEntity.idField];
                    if (id !== null && id !== undefined) {
                        idList.push(id);
                    }
                }

                if (assoc.inverseAssocName === undefined) {
                    throw `Assoc ${xEntity.name}.${assoc.name} has no inverse assoc.`;
                }
                const repository = manager.getRepository(xChildEntity.name);
                const selectQueryBuilder: SelectQueryBuilder<unknown> = repository.createQueryBuilder("t0");
                // note: the ManyToOne/OneToOne association "t0.${assoc.inverseAssocName}" is transformed to "t0.<idField>" in sql
                selectQueryBuilder.where(`t0.${assoc.inverseAssocName} = :rowId`, {rowId: rowId});
                if (idList.length > 0) {
                    selectQueryBuilder.andWhere(`t0.${xChildEntity.idField} NOT IN (:...idList)`, {idList: idList});
                }
                const rowList: any[] = await selectQueryBuilder.getMany();
                //console.log("Nasli sme na zrusenie:" + rowList.length);
                //console.log(rowList);
                if (rowList.length > 0) {
                    //await repository.remove(rowList);
                    const rowIdList: any[] = rowList.map(row => row[xChildEntity.idField]);
                    // this method also deletes possible associated objects (the method works for *toMany associations as well as for *toOne associations)
                    await this.removeRowsInTransaction(manager, xChildEntity, rowIdList, fileListToRemove);
                    // delete executes DELETE FROM directly, unlike remove, which first checks with a SELECT whether the given records exist in the DB
                    //await repository.delete(rowIdList);
                }
            }
        }

        // the actual insert/update of the entity
        const repository = manager.getRepository(row.entity);
        //console.log(row.object);
        //const date = row.object.carDate;
        //console.log(typeof date);
        const objectReloaded: any = await repository.save(row.object);

        return row.reload ? objectReloaded : {};
    }

    async removeRow(row: RemoveRowParam): Promise<void> {
        // we put all db operations into one transaction
        const fileListToRemove: Array<string> = new Array<string>();
        await this.dataSource.transaction(manager => this.removeRowInTransaction(manager, row, fileListToRemove));
        // the transaction was committed, we delete possible files
        // (if we deleted before the commit and the commit did not go through, an inconsistency would arise; if deleting a file does not go through it is not such a tragedy)
        this.removeFiles(fileListToRemove);
    }

    async removeRowInTransaction(manager: EntityManager, row: RemoveRowParam, fileListToRemove?: Array<string>): Promise<void> {

        // on a OneToMany association we normally have {cascade: ["insert", "update", "remove"]}
        // "insert" and "update" are needed so that detail records are also written when save(<master>) is called,
        // for "remove" I would expect it to apply for remove(<master>) but it does not work (not even when I call remove instead of delete)
        // adding onDelete: "CASCADE" on OneToMany, or ManyToOne, did not help either...
        // sending the whole json object (also with child records) did not help either... <- that is probably necessary if it is to work...
        // that is why we added cascade delete, it works through all associations that have cascade "remove"
        // in addition we also have file deletion here, if the object tree contains a FileMeta record

        // update 14.5.2024: TypeORM does not support cascade delete on associations ("remove" maybe serves to call listeners hooked on the remove operation, I do not know...)
        // cascade delete is implemented in the DB through FK constraints (the ON DELETE CASCADE clause - this clause is created by the option {onDelete: "CASCADE"} written
        // on the ManyToOne association - in the case when tables are generated from the model)
        // the only exception is ManyToMany associations - if remove(<master>) is called it automatically deletes the "link" records
        // (ManyToMany attributes do not have to be loaded, TypeORM finds out with selects whether "link" records exist)
        // for simplicity I decided to use ON DELETE CASCADE in the database for "link" records (applies only to ManyToMany associations)

        // it would probably not be a bad idea in the future to switch to cascade delete implemented in the DB through FK constraints, since that is what they decided on in TypeORM...

        const xEntity: Entity = this.entityMetadataService.getEntity(row.entity);
        return this.removeRowsInTransaction(manager, xEntity, [row.id], fileListToRemove, row.assocsToRemove);
    }

    async removeRowsInTransaction(manager: EntityManager, xEntity: Entity, rowIdList: any[], fileListToRemove?: Array<string>, assocsToRemove?: string[]) {
        // we generate a query - with one select we load the whole tree of records that we are going to delete
        // we go recursively through all associations that have cascade "remove" set
        const alias: string = "t";
        const repository = manager.getRepository(xEntity.name);
        const selectQueryBuilder: SelectQueryBuilder<unknown> = repository.createQueryBuilder(alias);
        // the call this.addAssocsOfEntity adds left joins into selectQueryBuilder
        // assocsToRemove is implemented in a simplified way, only for the first level
        // if it is to work for a whole path e.g. "assoc1.assoc2", a map assocAliasMap has to be created (similarly as for the lazy table)
        // and at the same time adding associations through cascade remove has to be run for each alias (including the main one), collecting ids has to be done similarly too
        if (this.addAssocsOfEntity(selectQueryBuilder, xEntity, alias, assocsToRemove)) {
            // if we added at least 1 leftJoin
            selectQueryBuilder.whereInIds(rowIdList);

            // we load the whole tree and write down the ids for remove (in the correct order)
            const rowList: any[] = await selectQueryBuilder.getMany();
            const rowIdListToRemove: RowIdListToRemove = new RowIdListToRemove();
            for (const row of rowList) {
                this.addRowOfEntityToRemove(xEntity, row, rowIdListToRemove, fileListToRemove, assocsToRemove);
            }

            // we delete the collected ids
            for (const rowIdList of rowIdListToRemove.entityRowIdListList) {
                await this.deleteRows(manager, rowIdList.entity, rowIdList.rowIdList);
            }
        }
        else {
            // optimization
            // we did not add even 1 leftJoin, there is no need to do a SELECT of the whole tree, we save it and go directly to delete
            await this.deleteRows(manager, xEntity.name, rowIdList);
        }
    }

    addAssocsOfEntity(selectQueryBuilder: SelectQueryBuilder<unknown>, xEntity: Entity, alias: string, assocsToRemove?: string[]): boolean {
        // we go through all associations (that have cascade "remove", both *toMany and *toOne) and add them into the query
        let leftJoinAdded: boolean = false;
        const assocList: Assoc[] = this.entityMetadataService.getAssocList(xEntity).filter((assoc: Assoc) => this.filterForAssocToRemove(assoc, assocsToRemove));
        for (const [index, assoc] of assocList.entries()) {
            const aliasForAssoc: string = `${alias}_${index}`; // we want a unique alias within the whole tree, so we create something like e.g. t_2_0_1
            selectQueryBuilder.leftJoinAndSelect(`${alias}.${assoc.name}`, aliasForAssoc);
            leftJoinAdded = true;
            const xAssocEntity: Entity = this.entityMetadataService.getEntity(assoc.entityName);
            this.addAssocsOfEntity(selectQueryBuilder, xAssocEntity, aliasForAssoc, undefined); // for now implemented only for the first level
        }
        return leftJoinAdded;
    }

    addRowOfEntityToRemove(xEntity: Entity, row: any, rowIdListToRemove: RowIdListToRemove, fileListToRemove?: Array<string>, assocsToRemove?: string[]) {
        // we delete "row" together with its associated objects
        // we have to delete in the correct order so that we do not violate FK constraints (and if associations create a cycle, even the correct order will not help us...)

        // first the *toMany associations
        const assocToManyList: Assoc[] = this.entityMetadataService.getAssocList(xEntity, ["one-to-many", "many-to-many"]).filter((assoc: Assoc) => this.filterForAssocToRemove(assoc, assocsToRemove));
        for (const assoc of assocToManyList) {
            const assocRowList: any[] = row[assoc.name];
            for (const assocRow of assocRowList) {
                this.addRowOfEntityToRemove(this.entityMetadataService.getEntity(assoc.entityName), assocRow, rowIdListToRemove, fileListToRemove, undefined); // for now implemented only for the first level
            }
        }

        // we store the id of the "row" record for remove
        const rowId: any = row[xEntity.idField];
        rowIdListToRemove.addRowId(xEntity.name, rowId);
        // if it is a row of type FileMeta, we also delete the file (if it exists)
        if (fileListToRemove !== undefined && xEntity.name === "FileMeta") {
            // TODO - cast to FileMeta
            // if row.pathName === null, the file is written in the DB in the "row" record
            if (row.pathName !== null) {
                // we delete the file from the directory app-files/x-files/<xFile.pathName>
                fileListToRemove.push(join(Utils.getXFilesDir(), row.pathName));
            }
        }

        // now we can delete the *toOne associations
        const assocToOneList: Assoc[] = this.entityMetadataService.getAssocList(xEntity, ["one-to-one", "many-to-one"]).filter((assoc: Assoc) => this.filterForAssocToRemove(assoc, assocsToRemove));
        for (const assoc of assocToOneList) {
            const assocRow: any = row[assoc.name];
            // if there is null in the FK column, then I think the association is null (it could also be undefined (absent))
            if (assocRow) {
                this.addRowOfEntityToRemove(this.entityMetadataService.getEntity(assoc.entityName), assocRow, rowIdListToRemove, fileListToRemove, undefined); // for now implemented only for the first level
            }
        }
    }

    // helper method
    filterForAssocToRemove(assoc: Assoc, assocsToRemove?: string[]): boolean {
        return assoc.isCascadeRemove || (assocsToRemove !== undefined && assocsToRemove.includes(assoc.name));
    }

    async deleteRows(manager: EntityManager, entity: string, rowIdList: any[]) {
        const repository = manager.getRepository(entity);
        // delete executes DELETE FROM directly, unlike remove, which first checks with a SELECT whether the given records exist in the DB
        await repository.delete(rowIdList);
    }

    removeFiles(fileListToRemove: Array<string>) {
        for (const file of fileListToRemove) {
            // if deleting the file fails, we only log it
            try {
                unlinkSync(file);
            }
            catch (e) {
                console.log(`Could not remove file ${file}. Error: ${e}`);
            }
            //console.log(`Succesfully removed file ${file}`);
        }
    }

    // this method is supposed to be called in transaction and before save of the "object" (method sets lockDate and lockUser to null)
    async unlockRowForSave(manager: EntityManager, entity: string, object: any) {

        const lockDate: Date | null = dateFromModel(object.lockDate ?? null);
        if (lockDate) {
            const xEntity: Entity = this.entityMetadataService.getEntity(entity);
            const rowId: number = object[xEntity.idField];
            const rowFromDB: any = await this.findRowByIdForLocking(manager, entity, rowId);
            // if the lock was not replaced by newer lock, remove the lock
            // TODO - select also id of lockUser and compare with lockUser from request
            const lockDateFromDB: Date | null = rowFromDB.lockDate;
            if (lockDateFromDB && lockDateFromDB.getTime() === lockDate.getTime()) {
                object.lockDate = null;
                object.lockUser = null;
            }
            else {
                // someone overtook the lock (and may already finished the editing)
                // we use exception to inform user (like by optimistic locking)
                if (lockDateFromDB) {
                    const rowFromDBWithUser: any = await this.findRowByIdWithAssoc(manager, entity, rowId, "lockUser");
                    throw new AppError(localeOption('pessimisticLockFailedLockPresent', {lockUser: rowFromDBWithUser.lockUser?.name, lockDate: datetimeAsUI(lockDateFromDB)}));
                }
                else {
                    // editing by other user has finished
                    // TODO - check if attributes modifDate/modifUser exist in entity
                    const rowFromDBWithUser: any = await this.findRowByIdWithAssoc(manager, entity, rowId, "modifUser");
                    throw new AppError(localeOption('pessimisticLockFailedLockFinished', {modifUser: rowFromDBWithUser.modifUser?.name, modifDate: datetimeAsUI(rowFromDBWithUser.modifDate)}));
                }
            }
        }
    }

    // unlock row for cancel
    async unlockRow(unlockRowRequest: UnlockRowRequest) {
        return this.dataSource.transaction(manager => this.unlockRowInTransaction(manager, unlockRowRequest));
    }

    private async unlockRowInTransaction(manager: EntityManager, unlockRowRequest: UnlockRowRequest) {
        const row: any = await this.findRowByIdForLocking(manager, unlockRowRequest.entity, unlockRowRequest.id);
        // if the lock was not replaced by newer lock, remove the lock
        // TODO - select also id of lockUser and compare with lockUser from request
        const lockDateFromDB: Date | null = row.lockDate;
        if (lockDateFromDB && lockDateFromDB.getTime() === dateFromModel(unlockRowRequest.lockDate).getTime()) {
            row.lockDate = null;
            row.lockUser = null;
            await manager.getRepository(unlockRowRequest.entity).save(row); // for now we use save, because update increments the version attribute
        }
    }

    async findRowByIdForLocking(manager: EntityManager, entity: string, id: number): Promise<any> {
        // simple select without outer joins (SELECT FOR UPDATE does not work if there is outer join in select (in postgres))
        // TODO - optimization - select only attribute lockDate + id of lockUser
        const selectQueryBuilderForUpdate: SelectQueryBuilder<unknown> = manager.getRepository(entity).createQueryBuilder("t");
        selectQueryBuilderForUpdate.whereInIds([id]);
        selectQueryBuilderForUpdate.setLock("pessimistic_write"); // SELECT FOR UPDATE
        return selectQueryBuilderForUpdate.getOneOrFail();
    }

    private async findRowByIdWithAssoc(manager: EntityManager, entity: string, id: number, assoc: string): Promise<any> {
        // TODO - optimisation - select only proper attributes
        const selectQueryBuilder: SelectQueryBuilder<unknown> = manager.getRepository(entity).createQueryBuilder("t");
        selectQueryBuilder.leftJoinAndSelect(`t.${assoc}`, "t1");
        selectQueryBuilder.whereInIds([id]);
        return selectQueryBuilder.getOneOrFail();
    }

    /* old simple removeRow
    async removeRowInTransactionOld(manager: EntityManager, row: RemoveRowParam): Promise<void> {

        const xEntity: Entity = this.entityMetadataService.getEntity(row.entity);

        // we go through all *ToMany associations (that have cascade "remove") and delete their child records
        const assocList: Assoc[] = this.entityMetadataService.getAssocList(xEntity, ["one-to-many", "many-to-many"]).filter((assoc: Assoc) => assoc.isCascadeRemove);
        for (const assoc of assocList) {
            const xChildEntity: Entity = this.entityMetadataService.getEntity(assoc.entityName);
            if (assoc.inverseAssocName === undefined) {
                throw `Assoc ${xEntity.name}.${assoc.name} has no inverse assoc.`;
            }
            const childRepository = manager.getRepository(xChildEntity.name);
            const selectQueryBuilder: SelectQueryBuilder<unknown> = childRepository.createQueryBuilder("t0");
            // note: the ManyToOne/OneToOne association "t0.${assoc.inverseAssocName}" is transformed to "t0.<idField>" in sql
            selectQueryBuilder.where(`t0.${assoc.inverseAssocName} = :rowId`, {rowId: row.id});
            const rowList: any[] = await selectQueryBuilder.getMany();
            if (rowList.length > 0) {
                // delete executes DELETE FROM directly, unlike remove, which first checks with a SELECT whether the given records exist in the DB
                const rowIdList: any[] = rowList.map(row => row[xChildEntity.idField]);
                await childRepository.delete(rowIdList);
            }
        }

        // the actual delete of the entity
        const repository = manager.getRepository(row.entity);
        await repository.delete(row.id);

        /*
            NOTE: it would be more efficient to use DeleteQueryBuilder (direct DELETE FROM ... WHERE <fk-column> = <id>),
            but it has bugs - here is an example of code that I tried (it assumes that alongside the ManyToOne association we also have an attribute for the FK column)

            const repository = this.dataSource.getRepository(VydajDobrovolnik);

            // DeleteQueryBuilder does not work if we want to use table aliases and map attribute names to column names
            // it is a bug - https://github.com/typeorm/typeorm/issues/5931
            const selectQueryBuilder: SelectQueryBuilder<VydajDobrovolnik> = repository.createQueryBuilder();
            //selectQueryBuilder.where("vydajD.idVydaj = :idVydaj", {idVydaj: row.id});
            await selectQueryBuilder.delete().from(VydajDobrovolnik, "vydajDobr").where("vydajDobr.idVydaj = :idVydaj", {idVydaj: row.id}).execute();
            // returns:
            //query failed: DELETE FROM `vydaj_dobrovolnik` WHERE vydajDobr.idVydaj = ? -- PARAMETERS: [22]
            //error: Error: ER_BAD_FIELD_ERROR: Unknown column 'vydajDobr.idVydaj' in 'where clause'

            // this does not work either:
            const selectQueryBuilder: SelectQueryBuilder<VydajDobrovolnik> = repository.createQueryBuilder("vydajD");
            selectQueryBuilder.where("vydajD.idVydaj = :idVydaj", {idVydaj: row.id});
            await selectQueryBuilder.delete().execute();
        /
    }
    */

    /* old authetication
    async userAuthentication(userAuthenticationRequest: XUserAuthenticationRequest): Promise<XUserAuthenticationResponse> {
        const repository = this.dataSource.getRepository(XUser);
        const selectQueryBuilder: SelectQueryBuilder<XUser> = repository.createQueryBuilder("xUser");
        selectQueryBuilder.where("xUser.username = :username", userAuthenticationRequest);
        const xUserList: XUser[] = await selectQueryBuilder.getMany();
        let userAuthenticationResponse: XUserAuthenticationResponse;
        if (xUserList.length === 1 && await bcrypt.compare(userAuthenticationRequest.password, xUserList[0].password)) {
            userAuthenticationResponse = {authenticationOk: true, xUser: xUserList[0]};
        }
        else {
            userAuthenticationResponse = {authenticationOk: false};
        }
        return userAuthenticationResponse;
    }
    */

    async userSaveRow(row: SaveRowParam) {
        const repository = this.dataSource.getRepository(row.entity);
        // if the password was changed, it has to be hashed
        // if a new password was not filled in, then undefined comes in password and the mapper will not change the attribute
        if (Utils.getEnvVarValue(EnvVar.X_AUTH) === Auth.LOCAL) {
            if (row.object.password && row.object.password !== '') {
                row.object.password = await this.localAuthService.hashPassword(row.object.password);
            }
        }

        // the depaul project needs to work with detail records, that is why we call this.saveRow
        //await repository.save(row.object);
        await this.saveRow(row);
    }

    /* old authentication
    // temporarily here for now
    async checkAuthentication(headerAuth: string) {
        // for now for simplicity we always check in the DB (it would be better to cache)
        if (headerAuth === undefined) {
            throw "Authentication failed.";
        }
        if (!headerAuth.startsWith("Basic ")) {
            throw "Authentication failed.";
        }
        const headerAuthDecoded: string = Buffer.from(headerAuth.substring("Basic ".length), 'base64').toString();
        const posColon: number = headerAuthDecoded.indexOf(":");
        if (posColon === -1) {
            throw "Authentication failed.";
        }
        const username: string = headerAuthDecoded.substring(0, posColon);
        const password: string = headerAuthDecoded.substring(posColon + 1);

        // note: apparently this simple way (select only password) was used because this select was called on every request
        const repository = this.dataSource.getRepository(XUser);
        const selectQueryBuilder: SelectQueryBuilder<XUser> = repository.createQueryBuilder("xUser");
        selectQueryBuilder.select("xUser.password", "passwordDB");
        selectQueryBuilder.where("xUser.username = :username", {username: username});

        const {passwordDB} = await selectQueryBuilder.getRawOne();
        if (!await bcrypt.compare(password, passwordDB)) {
            throw "Authentication failed.";
        }
        //console.log(`Autentifikacia zbehla ok pre ${username}/${password}`);
    }
    */

    /* old authentication
    checkAuthenticationPublic(headerAuth: string) {
        const xTokenPublic = Utils.xTokenPublic;
        if (headerAuth === undefined || headerAuth !== `Basic ${Buffer.from(xTokenPublic.username + ':' + xTokenPublic.password).toString('base64')}`) {
            throw "Authentication failed.";
        }
        //console.log(`Public autentifikacia zbehla ok`);
    }
    */

    async postLogin(reqUser: any, xPostLoginRequest: PostLoginRequest): Promise<PostLoginResponse> {
        let username: string;
        if (Utils.getEnvVarValue(EnvVar.X_AUTH) === Auth.OFF) {
            username = xPostLoginRequest.username;
        }
        else if (Utils.getEnvVarValue(EnvVar.X_AUTH) === Auth.LOCAL) {
            username = reqUser.username; // remark: could be also xPostLoginRequest.username, but username from token is harder to replace/fake
        }
        else if (Utils.getEnvVarValue(EnvVar.X_AUTH) === Auth.AUTH0) {
            // email (username) must be added in auth0.com to the access token
            // how to do it: in auth0.com: Actions -> Triggers -> click post-login, then create custom action with this body:
            /*
            exports.onExecutePostLogin = async (event, api) => {
                if (event.authorization) {
                    api.accessToken.setCustomClaim('x-custom-claim-email', event.user.email);
                    //console.log(`Logging user's email: ${event.user.email}`)
                }
            };
            */
            // and add action to the diagram of post-login using drag and drop

            // original solution was:
            //const emailKey = Utils.getEnvVarValue(EnvVar.X_AUTH0_AUDIENCE) + 'email'; <-- why to use audience?
            const emailKey = 'x-custom-claim-email'; // new solution
            username = reqUser[emailKey];
            if (username === undefined) {
                throw `Email of the current user was not found in access token. Email-key = ${emailKey}`;
            }
        }
        else if (Utils.getEnvVarValue(EnvVar.X_AUTH) === Auth.MS_ENTRA_ID) {
            // this is used for AAD - preferred_username is a suspicious name but I did not feel like looking for something better
            //console.log(reqUser);
            username = reqUser.preferred_username
        }

        const repository = this.dataSource.getRepository(User);
        const selectQueryBuilder: SelectQueryBuilder<User> = repository.createQueryBuilder("xUser");
        selectQueryBuilder.where("xUser.username = :username", {username: username});
        const xUser: User | null = await selectQueryBuilder.getOne();
        // we turn off data synchronization, because for auth0 accounts it overwrites the name with the email
        // if (xUser !== null) {
        //     // data synchronization
        //     if (xPostLoginRequest.username !== undefined) {
        //         xUser.name = xPostLoginRequest.username;
        //         await repository.save(xUser);
        //     }
        // }
        return {user: xUser !== null ? xUser : undefined};
    }

    // helper functions - maybe better UtilsService

    async getSequenceValue(sequenceName: string): Promise<number> {
        const rowList: any[] = await this.dataSource.query(`SELECT nextval('${Utils.getSchema()}.${sequenceName}') AS value`);
        return numberFromModel(rowList[0].value);
    }

    async setSequenceValue(sequenceName: string, value: number): Promise<void> {
        await this.dataSource.query(`SELECT setval('${Utils.getSchema()}.${sequenceName}', ${value}, false)`);
    }

    async getParamValueAsInt(paramCode: string): Promise<number> {
        const paramValue: string = await this.getParamValue(paramCode);
        const paramValueInt: number | null | undefined = intFromUI(paramValue);
        if (paramValueInt === null || paramValueInt === undefined) {
            throw `Param ${paramCode}: could not convert param value ${paramValue} to int.`;
        }
        return paramValueInt;
    }

    async getParamValueAsDate(paramCode: string): Promise<Date> {
        const paramValue: string = await this.getParamValue(paramCode);
        const paramValueDate: Date | null | undefined = dateFromUI(paramValue);
        if (paramValueDate === null || paramValueDate === undefined) {
            throw `Param ${paramCode}: could not convert param value ${paramValue} to date.`;
        }
        return paramValueDate;
    }

    async getParamValue(paramCode: string): Promise<string> {
        const repository = this.dataSource.getRepository(Parameter);
        const sqb: SelectQueryBuilder<Parameter> = repository.createQueryBuilder("parameter");
        sqb.where("parameter.code = :code", {code: paramCode});
        const parameter: Parameter | null = await sqb.getOne();
        if (parameter === null) {
            throw `Parameter row for code = ${paramCode} not found.`;
        }
        return parameter.value;
    }
}
