import {FormBase} from "../form";
import React, {useEffect} from "react";
import {Utils} from "../../utils/Utils";
import {Dropdown} from "primereact/dropdown";
import type {DropdownOptionsMap, TableFieldReadOnlyProp} from "../detail-data-table";
import type {Assoc} from "../../common/EntityMetadata";
import type {CustomFilter} from "../../common/FindParam";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";

export const TableSelectField = (props: {
        form: FormBase;
        entity: string;
        assocField: string;
        displayField: string;
        sortField?: string;
        filter?: CustomFilter;
        dropdownOptionsMap: DropdownOptionsMap;
        onDropdownOptionsMapChange: (dropdownOptionsMap: DropdownOptionsMap) => void;
        rowData: any;
        readOnly?: TableFieldReadOnlyProp;
    }) => {

    // note: loading/saving options is pulled up into the parent component DetailDataTable so that we do not load options for every row of the table

    // "members"
    const xAssoc: Assoc = UtilsMetadataCommon.getAssocToOne(UtilsMetadataCommon.getEntity(props.entity), props.assocField);
    const idField: string = UtilsMetadataCommon.getEntity(xAssoc.entityName).idField;

    // parameter [] ensures that the method is called only after the first rendering (and not after every state change (calling setSomething()))
    useEffect(() => {
        //console.log("TableSelectField - useEffect called *******************")
        findOptions();
    },[]); // eslint-disable-line react-hooks/exhaustive-deps

    const findOptions = async () => {

        // we load options if we have not loaded them yet
        let options: any[] = props.dropdownOptionsMap[props.assocField];
        if (options === undefined) {
            // I put the loading here, because I am afraid that if I put it outside useEffect (e.g. directly into the bodyTemplate function), then because of the Promise I would postpone creating components to another time and that would probably not be good
            // This is a bit of a hack - by writing an empty array we mark that we are going to load options from the DB (this happens on the first row of the table).
            // When this code then runs for further rows of the table, they find an empty array (not undefined) in props.dropdownOptionsMap[props.assocField] and no longer trigger loading from the DB.
            // Because of asynchronicity, the load from the DB runs only after this method has been called for all rows of the table, which is too late for us.
            // if this line were not here, options would be loaded as many times as there are rows in the table
            props.dropdownOptionsMap[props.assocField] = [];

            const xAssoc: Assoc = UtilsMetadataCommon.getAssocToOne(UtilsMetadataCommon.getEntity(props.entity), props.assocField);
            //options = await Utils.fetchMany('x-find-rows-for-assoc', {entity: props.entity, assocField: props.assocField});
            options = await Utils.fetchRows(xAssoc.entityName, props.filter, props.sortField ?? props.displayField);
            options.splice(0, 0, {[idField]: null, [props.displayField]: ""}); // null item (do not add for not null attributes)
            props.dropdownOptionsMap[props.assocField] = options;
            //console.log("TableSelectField - findOptions - we read options for field = " + props.assocField);
            //console.log(props.dropdownOptionsMap);
            props.onDropdownOptionsMapChange(props.dropdownOptionsMap); // we render the loaded values
        }
    }

    const onValueChange = (assocField: string, rowData: any, newValue: any) => {
        // we change the value in the model (the value is read from there)
        let newValueOrNull: any;
        // the special null item has id === null
        if (newValue[idField] === null) {
            newValueOrNull = null;
        }
        else {
            newValueOrNull = newValue;
        }
        rowData[assocField] = newValueOrNull;
        // since "rowData" is part of "props.form.state.object", it is enough to call setState({object: object}) for the change to show up
        props.form.onObjectDataChange();
    }

    // Dropdown sets into the attribute object.assocField the associated object from the list of objects that we obtain according to the association
    let assocObject = null;
    if (props.rowData !== null) {
        assocObject = props.rowData[props.assocField];
        // on insert of a new row all fields are (for now) undefined, we set them to null, null is the standard
        if (assocObject === undefined) {
            assocObject = null;
        }
    }

    const options = props.dropdownOptionsMap[props.assocField] !== undefined ? props.dropdownOptionsMap[props.assocField] : []; // maybe we can put undefined straight into options...
    const readOnly: boolean = Utils.isReadOnlyTableField(undefined, props.readOnly, props.form.state.entityRow, props.rowData);

    // appendTo={document.body} appends the overlay panel to the body element - eliminates the overflow problem (see the note in TableFilterSelectInput)
    return (
        <Dropdown appendTo={document.body} id={props.assocField} optionLabel={props.displayField} value={assocObject} options={options} dataKey={idField}
                  onChange={(e: any) => onValueChange(props.assocField, props.rowData, e.target.value)} readOnly={readOnly} disabled={readOnly}/>
    );
}
