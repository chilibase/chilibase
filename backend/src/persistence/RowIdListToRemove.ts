// pomocna struktura - ukladame si sem id-cka zaznamov ktore neskor vymazeme
// poradie id-ciek je dolezite aby nam mazanie zaznamov nepadlo na fk-constraintoch
// hromadime id-cka s rovnakou entity, pre 1 item EntityRowIdList bude vygenerovany 1 DELETE FROM
// nie je to dokonala optimalizacia ale na vecsinu pripadov nam staci...

export interface EntityRowIdList {
    entity: string;
    rowIdList: Array<any>;
}

export class RowIdListToRemove {

    entityRowIdListList: Array<EntityRowIdList>;

    constructor() {
        this.entityRowIdListList = new Array<EntityRowIdList>();
    }

    addRowId(entity: string, rowId: any) {
        if (this.entityRowIdListList.length > 0) {
            const lastItem: EntityRowIdList = this.entityRowIdListList[this.entityRowIdListList.length - 1];
            if (entity === lastItem.entity) {
                lastItem.rowIdList.push(rowId);
            }
            else {
                // zmenila sa entita, vytvorime novy zaznam
                this.addNewEntityItem(entity, rowId);
            }
        }
        else {
            this.addNewEntityItem(entity, rowId);
        }
    }

    private addNewEntityItem(entity: string, rowId: any) {
        const newEntityItem: EntityRowIdList = {entity: entity, rowIdList: new Array<any>()};
        newEntityItem.rowIdList.push(rowId);
        this.entityRowIdListList.push(newEntityItem);
    }
}
