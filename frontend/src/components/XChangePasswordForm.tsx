import React, {useState} from "react";
import {XUtils} from "./XUtils";
import {Password} from "primereact/password";
import {Button} from "primereact/button";
import {InputText} from "primereact/inputtext";

export const XChangePasswordForm = () => {

    const [passwordCurrent, setPasswordCurrent] = useState("");
    const [passwordNew, setPasswordNew] = useState("");
    const [passwordNewConfirm, setPasswordNewConfirm] = useState("");

    const onClickSave = async () => {

        if (passwordNew === '') {
            alert("New password is required.");
            return;
        }

        if (passwordNew !== passwordNewConfirm) {
            alert("New password and confirmed new password are not equal.");
            return;
        }

        try {
            await XUtils.post('x-local-auth-change-password', {passwordCurrent: passwordCurrent, passwordNew: passwordNew});
        }
        catch (e) {
            XUtils.showErrorMessage("Change password failed.", e);
            return;
        }

        alert('Password changed successfully.');

        setPasswordCurrent('');
        setPasswordNew('');
        setPasswordNewConfirm('');
    }

    return(
        // autoComplete="new-password" - bez tohto chrome predplna user/password, ak si user da ulozit user/password (pre danu url)
        <div>
            <div className="x-form-row">
                <div className="x-form-col">
                    <div className="flex justify-content-center">
                        <h2>Change password</h2>
                    </div>
                    <div className="field grid">
                        <label className="col-fixed" style={{width:'14rem'}}>User</label>
                        <InputText value={XUtils.getXToken()?.user?.username} readOnly={true}/>
                    </div>
                    <div className="field grid">
                        <label className="col-fixed" style={{width:'14rem'}}>Current password</label>
                        <Password value={passwordCurrent} onChange={(e: any) => setPasswordCurrent(e.target.value)} feedback={false} maxLength={64} autoComplete="new-password"/>
                    </div>
                    <div className="field grid">
                        <label className="col-fixed" style={{width:'14rem'}}>New password</label>
                        <Password value={passwordNew} onChange={(e: any) => setPasswordNew(e.target.value)} feedback={false} maxLength={64} autoComplete="new-password"/>
                    </div>
                    <div className="field grid">
                        <label className="col-fixed" style={{width:'14rem', whiteSpace:'nowrap'}}>Confirm new password</label>
                        <Password value={passwordNewConfirm} onChange={(e: any) => setPasswordNewConfirm(e.target.value)} feedback={false} maxLength={64} autoComplete="new-password"/>
                    </div>
                </div>
            </div>
            <div className="flex justify-content-center">
                <Button label="Save" onClick={onClickSave} />
            </div>
        </div>
    )
}