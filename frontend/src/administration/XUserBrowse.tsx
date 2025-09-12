import {
    XLazyColumn,
    XLazyDataTable,
    type XSearchBrowseProps
} from "../components/XLazyDataTable/XLazyDataTable";
import React from "react";
import {XUser} from "../serverApi/XUser";
import {XUserForm} from "./XUserForm";
import {XUtils} from "../components/XUtils";

export const XUserBrowse = (props: XSearchBrowseProps) => {

    const onRemoveRow = async (selectedRow: XUser): Promise<boolean> => {
        if (selectedRow.username === XUtils.getUsername()) {
            alert("Can not remove current user.");
            return false;
        }

        if (window.confirm('Are you sure to remove the selected row?')) {
            await XUtils.removeRow("XUser", selectedRow);
            return true;
        }
        return false;
    }

    return (
        <XLazyDataTable entity="XUser" label="Users" rows={30}
                        EditForm={XUserForm} removeRow={onRemoveRow}
                        searchBrowseParams={props.searchBrowseParams}>
            <XLazyColumn field="id" header="ID"/>
            <XLazyColumn field="username" header="Username" width="17rem"/>
            <XLazyColumn field="name" header="Name" width="17rem"/>
            <XLazyColumn field="enabled" header="Enabled"/>
            <XLazyColumn field="admin" header="Admin"/>
        </XLazyDataTable>
    );
}
// zatial nepouzivane - prichystane do buducnosti
// ak by sme mali class komponenty, dal by sa pouzit decorator, pri formularoch mame class komponenty
XUtils.registerAppBrowse(<XUserBrowse/>, "XUser");
