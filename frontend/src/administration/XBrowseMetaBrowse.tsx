import {BrowseProps, LazyColumn, LazyDataTable} from "../components/lazy-data-table";
import React from "react";
import {XBrowseMetaForm} from "./XBrowseMetaForm";
import {XBrowseMeta} from "../common/XBrowseMetadata";

export const XBrowseMetaBrowse = (props: BrowseProps) => {

    const onEdit = (selectedRow: XBrowseMeta) => {

        // openForm pridavame automaticky v XFormNavigator3 pri renderovani komponentu
        props.openForm!(<XBrowseMetaForm id={selectedRow.id}/>);
    }

    return (
        <LazyDataTable entity="XBrowseMeta" rows={15} onEdit={onEdit} removeRow={true} displayed={props.displayed}>
            <LazyColumn field="id" header="ID"/>
            <LazyColumn field="entity" header="Entity" width="17rem"/>
            <LazyColumn field="browseId" header="Browse ID" width="17rem"/>
            <LazyColumn field="rows" header="Rows"/>
        </LazyDataTable>
    );
}
