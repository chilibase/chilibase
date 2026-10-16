// helper structure - we store here ids of records that we will delete later
// the order of the ids is important so that deleting records does not fail on fk constraints
// we accumulate ids with the same entity, for 1 EntityRowIdList item 1 DELETE FROM will be generated
// it is not a perfect optimization but it is enough for most cases...

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
                // the entity changed, we create a new record
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
