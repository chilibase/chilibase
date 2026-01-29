import React from "react";
import {BrowseProps, LazyColumn, LazyDataTable} from "../components/lazy-data-table";
import {XParamForm} from "./XParamForm";
import {CustomFilter} from "../common/FindParam";

export const XParamBrowse = (props: BrowseProps & {customFilter?: CustomFilter}) => {

    const onAddRow = () => {

        // openForm pridavame automaticky v XFormNavigator3 pri renderovani komponentu
        props.openForm!(<XParamForm/>);
    }

    const onEdit = (selectedRow: any) => {

        // openForm pridavame automaticky v XFormNavigator3 pri renderovani komponentu
        props.openForm!(<XParamForm id={selectedRow.id}/>);
    }

    return (
        <LazyDataTable entity="XParam" label="Parameters" sortField="id" rows={30} customFilter={props.customFilter}
                        onAddRow={onAddRow} onEdit={onEdit} removeRow={true} displayed={props.displayed}>
            <LazyColumn field="id" header="ID" width="8rem"/>
            <LazyColumn field="code" header="Code" width="16rem"/>
            <LazyColumn field="name" header="Name" width="45rem"/>
            <LazyColumn field="value" header="Value" width="16rem"/>
        </LazyDataTable>
    );
}
