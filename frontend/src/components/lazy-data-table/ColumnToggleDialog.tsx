import React, {useState} from "react";
import {Dialog} from "primereact/dialog";
import {Checkbox} from "primereact/checkbox";
import {Button} from "../button";
import {localeOption} from "../locale";

export interface ColumnToggleDialogItem {
    index: number; // index in columnToggles / props.children
    label: string;
}

export const ColumnToggleDialog = (props: {
    dialogOpened: boolean;
    items: ColumnToggleDialogItem[];
    columnToggles: boolean[];
    initColumnToggles: boolean[];
    onOk: (columnToggles: boolean[]) => void;
    onHide: () => void;
}) => {

    const [columnTogglesLocal, setColumnTogglesLocal] = useState<boolean[]>(props.columnToggles);

    // without onShow, reopening the dialog would keep previous local edits after Cancel
    const onShow = () => {
        setColumnTogglesLocal([...props.columnToggles]);
    }

    const onCheckboxChange = (index: number, checked: boolean) => {
        const columnTogglesNew: boolean[] = [...columnTogglesLocal];
        while (columnTogglesNew.length <= index) {
            columnTogglesNew.push(true);
        }
        columnTogglesNew[index] = checked;
        setColumnTogglesLocal(columnTogglesNew);
    }

    const onResetColumns = () => {
        setColumnTogglesLocal([...props.initColumnToggles]);
    }

    const onOk = () => {
        props.onOk(columnTogglesLocal);
        props.onHide();
    }

    return (
        <Dialog header={localeOption('columnToggle')} visible={props.dialogOpened} onShow={onShow} onHide={props.onHide}>
            {props.items.map((item: ColumnToggleDialogItem) => {
                const inputId: string = `column-toggle-${item.index}`;
                return (
                    <div key={item.index} className="field-checkbox mb-2">
                        <Checkbox inputId={inputId} checked={columnTogglesLocal[item.index] !== false}
                                  onChange={(e) => onCheckboxChange(item.index, e.checked ?? false)}/>
                        <label htmlFor={inputId} className="ml-2">{item.label}</label>
                    </div>
                );
            })}
            <div className="flex justify-content-center mt-3">
                <Button label={localeOption('resetColumns')} onClick={onResetColumns}/>
            </div>
            <div className="flex justify-content-center mt-2">
                <Button label={localeOption('ok')} onClick={onOk}/>
                <Button label={localeOption('cancel')} onClick={props.onHide}/>
            </div>
        </Dialog>
    );
}
