import React, {useEffect, useState} from "react";
import {Utils} from "../../utils/Utils";
import {Dropdown} from "primereact/dropdown";
import {UtilsCommon} from "../../common/UtilsCommon";
import type {Assoc} from "../../common/EntityMetadata";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";
import type {CustomFilter} from "../../common/FindParam";

// used in filter in LazyDataTable and in DetailDataTable
// does not use (for now) SelectInput, it is placed here because the functionality is similar to SelectInput
export const TableFilterSelectInput = (props: {entity: string; path: string; value: any; onValueChange: (field: string, displayValue: any) => void; filter?: CustomFilter; sortField?: string;}) => {

    const [options, setOptions] = useState<any[]>([]);

    const fieldList: string[] = UtilsCommon.getFieldListForPath(props.path);
    if (fieldList.length < 2) {
        throw `TableFilterSelectInput: prop path (${props.path}) must have at least 2 items`;
    }
    const displayField = fieldList[fieldList.length - 1];

    // parameter [] ensures that the method is called only after the first rendering (and not after every state change (calling setSomething()))
    useEffect(() => {
        findOptions(props.entity, props.path, displayField);
    },[]); // eslint-disable-line react-hooks/exhaustive-deps

    const onValueChange = (e: any) => {
        props.onValueChange(props.path, e.target.value);
    }

    const findOptions = async (entity: string, path: string, displayField: string) => {

        const xAssoc: Assoc = UtilsMetadataCommon.getLastAssocByPath(UtilsMetadataCommon.getEntity(entity), path);
        const options: any[] = await Utils.fetchRows(xAssoc.entityName, props.filter, props.sortField ?? displayField);
        const emptyOption: {[field: string]: any;} = {};
        emptyOption[displayField] = Utils.dropdownEmptyOptionValue;
        options.splice(0, 0, emptyOption); // null item (do not add for not null attributes)
        setOptions(options);
    }

    // the dropdown uses displayField as optionValue (not the whole object) - this is because of problems with the empty row (it could not be done otherwise)
    // appendTo={document.body} appends the overlay panel to the body element - thanks to that the panel is visible even when its parent (TH/TD element of the table)
    // has overflow: hidden set, or because of scrolling the overlay panel would not "go out" of the table, in the case that the table is small (e.g. it has 1 row)
    return (
        <Dropdown appendTo={document.body} style={{width: '100%'}} className="ui-column-filter"
                  optionLabel={displayField} optionValue={displayField} value={props.value} options={options} onChange={onValueChange}/>
    );
}



