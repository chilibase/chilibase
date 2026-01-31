import React, {useRef} from "react";
import {Dialog} from "primereact/dialog";
import {FormBase, FormWithLoaderProps, OnSaveOrCancelProp} from "./FormBase";
import {OperationType} from "../../utils/types";
import {FormProps} from "./FormBase";
import {FormWithLoader} from "./FormWithLoader";

export interface FormDialogState {
    opened: boolean;
    id?: number;
    initValues?: object;
    onSaveOrCancel?: OnSaveOrCancelProp;
    Form?: React.ComponentType<FormProps>;  // overrides prop form in FormDialog
    formElement?: React.ReactElement;  // overrides prop form in FormDialog
}

export const FormDialog = (props: {
    dialogState: FormDialogState;
    Form?: React.ComponentType<FormProps>;
    formElement?: React.ReactElement;
    entity: string; // entity of the form - better would be to take entity from form (if it is technically possible)
}) => {

    const formBaseRef = useRef<FormBase>(null);

    const onHide = () => {
        formBaseRef.current!.cancelEdit();
    }

    const createFormElem = (): React.ReactElement | undefined => {
        let form: React.ReactElement | undefined = undefined; // resulting form (JSX element)
        // optimalisation (otherwise the component FormWithLoader is created even if the form is not opened)
        if (props.dialogState.opened) {
            const Form: React.ComponentType<FormProps> | undefined = props.dialogState.Form ?? props.Form;
            const formElement: React.ReactElement | undefined = props.dialogState.formElement ?? props.formElement;
            //console.log(`********** volany FormDialog.createFormElem entity = ${props.entity} Form = ${Form?.name} id = ${props.dialogState.id}`);
            if (Form || formElement) {
                // wrap form component into component that first calls loader and after that renders the original form component
                const FormWithLoaderComponent: React.FC<FormWithLoaderProps> = FormWithLoader(Form, formElement, props.entity, props.dialogState.id === undefined ? OperationType.Insert : OperationType.Update);
                form = <FormWithLoaderComponent formBaseRef={formBaseRef} id={props.dialogState.id} initValues={props.dialogState.initValues} onSaveOrCancel={props.dialogState.onSaveOrCancel} isInDialog={true} params={props.dialogState.initValues}/>;
            }
        }
        return form;
    }

    return (
        <Dialog key="dialog-form" className="x-dialog-without-header" visible={props.dialogState.opened} onHide={onHide}>
            {createFormElem()}
        </Dialog>
    );
}

