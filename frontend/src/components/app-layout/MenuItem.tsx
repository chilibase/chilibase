import React, {ReactNode} from "react";
import {NavLink} from "react-router";

// helper component

export interface MenuItemProps {
    to: string;
    label: ReactNode
}

export const MenuItem = (props: MenuItemProps) => {

    return (
        <NavLink to={props.to} className="p-menuitem-link">{props.label}</NavLink>
    );
}