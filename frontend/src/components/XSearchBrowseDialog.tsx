import React from "react";
import {Dialog} from "primereact/dialog";
import {XSearchBrowseParams} from "./XSearchBrowseParams";
import {SearchBrowseProps} from "./lazy-data-table";

export interface XSearchBrowseDialogState {
    opened: boolean;
    searchBrowseParams?: XSearchBrowseParams; // must be part of XSearchBrowseDialogState?
}

export const XSearchBrowseDialog = (props: {
    dialogState: XSearchBrowseDialogState;
    SearchBrowse?: React.ComponentType<SearchBrowseProps>;
    searchBrowseElement?: React.ReactElement;
    onHide: () => void;
}) => {

    const createBrowseElem = (): React.ReactElement | undefined => {
        let browse: React.ReactElement | undefined = undefined; // resulting browse (JSX element)
        // optimalisation (otherwise the browse component is created even if the browse is not opened)
        if (props.dialogState.opened) {
            if (props.SearchBrowse || props.searchBrowseElement) {
                if (props.SearchBrowse) {
                    // we use component type (idiomatic way)
                    browse = <props.SearchBrowse searchBrowseParams={props.dialogState.searchBrowseParams}/>;
                }
                else {
                    // we use JSX element (not recommended way, but we can pass (custom) props at app level)
                    browse = React.cloneElement(props.searchBrowseElement!, {
                        searchBrowseParams: props.dialogState.searchBrowseParams,
                    } satisfies SearchBrowseProps);
                }
            }
        }
        return browse;
    }

    return (
        <Dialog key="dialog-browse" className="x-dialog-without-header" visible={props.dialogState.opened} onHide={props.onHide}>
            {createBrowseElem()}
        </Dialog>
    );
}
