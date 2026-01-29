import {
    LazyColumn,
    LazyDataTable,
    type SearchBrowseProps
} from "../../components/lazy-data-table";
import React from "react";
import {User} from "./user.entity";
import {XUserForm} from "./XUserForm";
import {XUtils} from "../../components/XUtils";

export const XUserBrowse = (props: SearchBrowseProps) => {

    const onRemoveRow = async (selectedRow: User): Promise<boolean> => {
        if (selectedRow.username === XUtils.getUsername()) {
            alert("Can not remove current user.");
            return false;
        }

        if (window.confirm('Are you sure to remove the selected row?')) {
            await XUtils.removeRow("User", selectedRow);
            return true;
        }
        return false;
    }

    return (
        <LazyDataTable entity="User" label="Users" rows={30}
                        EditForm={XUserForm} removeRow={onRemoveRow}
                        searchBrowseParams={props.searchBrowseParams}>
            <LazyColumn field="id" header="ID"/>
            <LazyColumn field="username" header="Username" width="17rem"/>
            <LazyColumn field="name" header="Name" width="17rem"/>
            <LazyColumn field="enabled" header="Enabled"/>
            <LazyColumn field="admin" header="Admin"/>
        </LazyDataTable>
    );
}
