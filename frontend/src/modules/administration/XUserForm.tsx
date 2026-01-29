import type {FormProps} from "../../components/form";
import {InputText} from "../../components/input-text";
import React from "react";
import {InputDecimal} from "../../components/input-decimal";
import {Password} from "primereact/password";
import {OperationType, XUtils} from "../../components/XUtils";
import {FormFooter} from "../../components/form";
import {Checkbox} from "../../components/checkbox";
import {XEnvVar, XViteAuth} from "../../components/XEnvVars";
import {FormBaseModif} from "../../components/form";
import {InputDate} from "../../components/input-date";
import {XObject} from "../../components/XObject";
import {FormHeader} from "../../components/form";

export class XUserForm extends FormBaseModif {

    constructor(props: FormProps) {
        super(props, "User");

        this.state.usernameEnabledReadOnly = false;
        this.state.passwordNew = '';
        this.state.passwordNewConfirm = '';

        this.onClickSave = this.onClickSave.bind(this);
    }

    createNewObject(): XObject {
        return {enabled: true, admin: false, version: 0};
    }

    preInitForm(object: XObject, operationType: OperationType.Insert | OperationType.Update) {
        // current user cannot change username, enabled and admin status
        const username = object.username;
        if (operationType === OperationType.Update && username === XUtils.getUsername()) {
            this.setState({usernameEnabledReadOnly: true});
        }
    }

    async onClickSave(): Promise<void> {

        if (!await this.validateSave()) {
            return;
        }

        // password is used only by local authorization
        if (XUtils.getEnvVarValue(XEnvVar.VITE_AUTH) === XViteAuth.LOCAL) {
            if (this.isAddRow() && this.state.passwordNew === '') {
                alert("Password is required.");
                return;
            }

            if (this.state.passwordNew !== '' || this.state.passwordNewConfirm !== '') {

                if (this.state.passwordNew !== this.state.passwordNewConfirm) {
                    alert("New password and confirmed new password are not equal.");
                    return;
                }

                // zapiseme nove heslo do objektu
                this.state.object.password = this.state.passwordNew;
            }
            else {
                // nemenime heslo (atribut s hodnotou undefined sa nezapise do DB)
                this.state.object.password = undefined;
            }
        }

        this.preSave(this.state.object);

        const isAddRow = this.isAddRow();

        // zapise this.state.object do DB - samostatny servis koli hashovaniu password-u
        let object: XObject;
        try {
            object = await XUtils.post('userSaveRow', {entity: this.getEntity(), object: this.state.object});
        }
        catch (e) {
            XUtils.showErrorMessage("Save row failed.", e);
            return; // zostavame vo formulari
        }

        // formular je zobrazeny v dialogu
        this.props.onSaveOrCancel!(object, isAddRow ? OperationType.Insert : OperationType.Update);
    }

    render() {
        // autoComplete="new-password" - bez tohto chrome predplna user/password, ak si user da ulozit user/password (pre danu url)
        let passwordElems: any[] = [];
        if (XUtils.getEnvVarValue(XEnvVar.VITE_AUTH) === XViteAuth.LOCAL) {
            passwordElems = [
                <div className="field grid">
                    <label className="col-fixed" style={{width:'14rem'}}>New password</label>
                    <Password value={this.state.passwordNew} onChange={(e: any) => this.setState({passwordNew: e.target.value})} feedback={false} maxLength={64} size={20} autoComplete="new-password"/>
                </div>,
                <div className="field grid">
                    <label className="col-fixed" style={{width:'14rem', whiteSpace:'nowrap'}}>Confirm new password</label>
                    <Password value={this.state.passwordNewConfirm} onChange={(e: any) => this.setState({passwordNewConfirm: e.target.value})} feedback={false} maxLength={64} size={20} autoComplete="new-password"/>
                </div>
            ];
        }

        return (
            <div>
                <FormHeader label="User"/>
                <div className="x-form-row">
                    <div className="x-form-col">
                        <InputDecimal form={this} field="id" label="ID" readOnly={true} labelStyle={{width:'14rem'}}/>
                        <InputText form={this} field="username" label="Username" size={30} labelStyle={{width:'14rem'}} readOnly={this.state.usernameEnabledReadOnly}/>
                        <InputText form={this} field="name" label="Name" size={30} labelStyle={{width:'14rem'}}/>
                        <Checkbox form={this} field="enabled" label="Enabled" labelStyle={{width:'14rem'}} readOnly={this.state.usernameEnabledReadOnly}/>
                        <Checkbox form={this} field="admin" label="Admin" labelStyle={{width:'14rem'}} readOnly={this.state.usernameEnabledReadOnly}/>
                        {passwordElems}
                        <InputDate form={this} field="modifDate" label="Modified at" readOnly={true} labelStyle={{width:'14rem'}}/>
                        <InputText form={this} field="modifUser.name" label="Modified by" size={20} labelStyle={{width:'14rem'}}/>
                    </div>
                </div>
                <FormFooter form={this}/>
            </div>
        );
    }
}
