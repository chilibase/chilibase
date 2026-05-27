import React from "react";
import {BrowseProps, Column, LazyDataTable} from "../../components/lazy-data-table";
import {XParamForm} from "./XParamForm";
import {CustomFilter} from "../../common/FindParam";

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
            <Column field="id" header="ID" width="8rem"/>
            <Column field="code" header="Code" width="16rem"/>
            <Column field="name" header="Name" width="45rem"/>
            <Column field="value" header="Value" width="16rem"/>
        </LazyDataTable>
    );
}
