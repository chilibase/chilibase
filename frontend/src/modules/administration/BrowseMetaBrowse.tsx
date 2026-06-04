import {Column, LazyDataTable, type SearchBrowseProps} from "../../components/lazy-data-table";
import React from "react";
import {BrowseMetaForm} from "./BrowseMetaForm";

export const BrowseMetaBrowse = (props: SearchBrowseProps) => {

    return (
        <LazyDataTable entity="BrowseMeta" rows={15}
                       EditForm={BrowseMetaForm} removeRow={true}
                       searchBrowseParams={props.searchBrowseParams}>
            <Column field="id" header="ID"/>
            <Column field="entity" header="Entity" width="17rem"/>
            <Column field="browseId" header="Browse ID" width="17rem"/>
            <Column field="rows" header="Rows"/>
        </LazyDataTable>
    );
}
