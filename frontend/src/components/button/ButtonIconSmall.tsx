import React from "react";
import {Button as PrimeButton, ButtonProps} from "primereact/button";
import {Utils} from "../../utils/Utils";
import {IconType} from "primereact/utils";

// button with icon (without label) - rename to ButtonSmall?
export const ButtonIconSmall = (props: {icon: IconType<ButtonProps>; onClick: ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void); disabled?: boolean; tooltip?: any;}) => {

    return (
        <PrimeButton icon={props.icon} onClick={props.onClick} disabled={props.disabled}
                className={Utils.isMobile() ? undefined : 'x-button-icon-small p-button-sm'} tooltip={props.tooltip}/>
    );
}
