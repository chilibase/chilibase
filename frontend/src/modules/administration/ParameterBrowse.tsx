import React from "react";
import {Column, LazyDataTable, type SearchBrowseProps} from "../../components/lazy-data-table";
import {ParameterForm} from "./ParameterForm";
import {CustomFilter} from "../../common/FindParam";

export const ParameterBrowse = (props: SearchBrowseProps & {customFilter?: CustomFilter}) => {

    return (
        <LazyDataTable entity="Parameter" label="Parameters" sortField="id" rows={30} customFilter={props.customFilter}
                       EditForm={ParameterForm} removeRow={true}
                       searchBrowseParams={props.searchBrowseParams}>
            <Column field="id" header="ID" width="8rem"/>
            <Column field="code" header="Code" width="16rem"/>
            <Column field="name" header="Name" width="45rem"/>
            <Column field="value" header="Value" width="16rem"/>
        </LazyDataTable>
    );
}

