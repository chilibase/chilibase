import {BrowseProps, Column, LazyDataTable} from "../../components/lazy-data-table";
import React from "react";
import {BrowseMetaForm} from "./BrowseMetaForm";
import {BrowseMeta} from "./browse-meta.entity";

export const BrowseMetaBrowse = (props: BrowseProps) => {

    const onEdit = (selectedRow: BrowseMeta) => {

        // openForm pridavame automaticky v XFormNavigator3 pri renderovani komponentu
        props.openForm!(<BrowseMetaForm id={selectedRow.id}/>);
    }

    return (
        <LazyDataTable entity="BrowseMeta" rows={15} onEdit={onEdit} removeRow={true} displayed={props.displayed}>
            <Column field="id" header="ID"/>
            <Column field="entity" header="Entity" width="17rem"/>
            <Column field="browseId" header="Browse ID" width="17rem"/>
            <Column field="rows" header="Rows"/>
        </LazyDataTable>
    );
}
