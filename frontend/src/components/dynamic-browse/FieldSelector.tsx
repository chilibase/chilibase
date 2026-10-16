import React, {useEffect, useState} from "react";
import {TreeTable} from "primereact/treetable";
import {Column} from "primereact/column";
import type {Assoc, Entity} from "../../common/EntityMetadata";
import type {TreeNode} from "primereact/treenode";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";

export const FieldSelector = (props: {entity: string; assocSelectable: boolean; selectionField?: string; onSelectionChange: (selectedField: string) => void;}) => {

    // note: we could compute treeNodeList directly, but when we use useState/useEffect, createTreeNodeList is called only once when the component is created
    const [treeNodeList, setTreeNodeList] = useState<TreeNode[]>([]);

    // parameter [] ensures that the method is called only after the first rendering (and not after every state change (calling setSomething()))
    useEffect(() => {
        setTreeNodeList(createTreeNodeList(props.entity, ""));
    },[]); // eslint-disable-line react-hooks/exhaustive-deps

    const createTreeNodeList = (entity: string, keyPrefix: string): TreeNode[] => {
        const treeNodeList: TreeNode[] = [];
        const entityMeta: Entity = UtilsMetadataCommon.getEntity(entity);
        const fieldList = UtilsMetadataCommon.getFieldList(entityMeta);
        for (const entityField of fieldList) {
            treeNodeList.push({
                key: keyPrefix + entityField.name,
                data: {name: entityField.name, type: entityField.type},
                children: []
            });
        }
        const assocToOneList: Assoc[] = UtilsMetadataCommon.getAssocList(entityMeta, ["many-to-one", "one-to-one"]);
        for (const assoc of assocToOneList) {
            const itemKey = keyPrefix + assoc.name;
            treeNodeList.push({
                key: itemKey,
                data: {name: assoc.name, type: "AssocToOne"},
                children: createTreeNodeList(assoc.entityName, itemKey + "."),
                selectable: props.assocSelectable
            });
        }
        return treeNodeList;
    }

    return (
        <TreeTable value={treeNodeList} selectionMode="single" selectionKeys={props.selectionField} onSelectionChange={e => props.onSelectionChange(Object.keys(e.value)[0])}
                   className="x-field-treetable p-treetable-sm" scrollable scrollHeight="20rem">
            <Column field="name" header="Field name" headerStyle={{width: "15.7rem"}} expander></Column>
            <Column field="type" header="Type" headerStyle={{width: "9.3rem"}}></Column>
        </TreeTable>
    );
}
