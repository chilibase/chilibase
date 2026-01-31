import React from "react";
import {MenuItem} from "primereact/menuitem";
import {Menubar as PrimeMenubar} from "primereact/menubar";
import {Utils} from "../../utils/Utils";

// helper component

export interface MenubarProps {
    model: MenuItem[];
}

export const Menubar = (props: MenubarProps) => {

    /* dropdown ide nalavo, backend + user ide napravo (pomocou marginLeft: 'auto') - este boli potrebne zmeny v App.css */
    const end: any = (
        <div className="flex" style={{width: '100%'}}>
            <div className="flex align-content-center" style={{marginLeft: 'auto'}}>
                {!Utils.isMobile() ? <div style={{padding: '0.5rem'}}>Backend: {Utils.getXBackendUrl()}</div> : null}
                <div style={{padding: '0.5rem'}}>User: {/*Utils.getUsername()*/Utils.getXToken()?.user?.name}</div>
            </div>
        </div>
    );

    return (
        <PrimeMenubar id="menuId" model={props.model} end={end} className="mb-1"/>
    );
}