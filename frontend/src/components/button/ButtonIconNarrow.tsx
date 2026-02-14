import React from "react";
import {Button as PrimeButton, ButtonProps} from "primereact/button";
import {Utils} from "../../utils/Utils";
import {IconType} from "primereact/utils";

// button s ikonkou, zuzeny na 1.5rem (21px), na mobile nezuzeny, defaultne s marginom "m-1" (0.25rem) (ako XButton), margin sa da vypnut (pouzivane pre editovatelnu tabulku)
// zmyslom narrow buttonu je setrit miesto
// button with icon (without label) - rename to ButtonNarrow?
export const ButtonIconNarrow = (props: {icon: IconType<ButtonProps>; onClick: ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void); disabled?: boolean; tooltip?: any; addMargin?: boolean}) => {

    let className: string = '';
    if (!Utils.isMobile()) {
        className += 'x-button-icon-narrow';
    }
    if (props.addMargin === undefined || props.addMargin === true) {
        if (className !== '') {
            className += ' ';
        }
        className += 'm-1';
    }
    return (
        <PrimeButton icon={props.icon} onClick={props.onClick} disabled={props.disabled}
                className={className !== '' ? className : undefined} tooltip={props.tooltip}/>
    );
}
