import React, {type ReactElement, type ComponentType, cloneElement} from "react";
import {Dialog} from "primereact/dialog";
import type {SearchBrowseParams} from "./SearchBrowseParams";
import type {SearchBrowseProps} from "../lazy-data-table";

export interface SearchBrowseDialogState {
    opened: boolean;
    searchBrowseParams?: SearchBrowseParams; // must be part of SearchBrowseDialogState?
}

export const SearchBrowseDialog = (props: {
    dialogState: SearchBrowseDialogState;
    SearchBrowse?: ComponentType<SearchBrowseProps>;
    searchBrowseElement?: ReactElement;
    onHide: () => void;
}) => {

    const createBrowseElem = (): ReactElement | undefined => {
        let browse: ReactElement | undefined = undefined; // resulting browse (JSX element)
        // optimalisation (otherwise the browse component is created even if the browse is not opened)
        if (props.dialogState.opened) {
            if (props.SearchBrowse || props.searchBrowseElement) {
                if (props.SearchBrowse) {
                    // we use component type (idiomatic way)
                    browse = <props.SearchBrowse searchBrowseParams={props.dialogState.searchBrowseParams}/>;
                }
                else {
                    // we use JSX element (not recommended way, but we can pass (custom) props at app level)
                    browse = cloneElement(props.searchBrowseElement as ReactElement<SearchBrowseProps>, {
                        searchBrowseParams: props.dialogState.searchBrowseParams,
                    });
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
