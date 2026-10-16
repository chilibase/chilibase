import React, {type ReactElement, type ReactNode, useState} from "react";
import type {MultilineRenderType} from "./LazyDataTable";
import {Button} from "primereact/button";

export const MultilineRenderer = (props: {
    valueList: ReactNode[];
    renderType: MultilineRenderType;
    fewLinesCount: number;
    multilineContent?: boolean;
}): ReactElement => {

    // used only for props.renderType === "fewLines"
    const [showAllLines, setShowAllLines] = useState<boolean>(false);

    let valueResult: ReactElement; // we must return an element if we want to call XMultilineRenderer directly via jsx
    if (props.renderType === "singleLine") {
        // TODO - join elements
        valueResult = <div>{props.valueList.join(", ")}</div>; // used mainly for oneToMany associations
    }
    else {
        let valueListLocal: ReactNode[] = props.valueList;
        if (props.renderType === "fewLines" && !showAllLines) {
            valueListLocal = valueListLocal.slice(0, props.fewLinesCount);
        }

        const elemList: ReactNode[] = valueListLocal.map((value: any, index: number) => <div key={index}>{value}</div>);
        if (props.renderType === "fewLines") {
            if (props.valueList.length > props.fewLinesCount) {
                // we overwrite the last element in the list - we add a button to it
                const elemListLastIndex: number = elemList.length - 1;
                elemList[elemListLastIndex] =
                    <div key={elemListLastIndex}>
                        {valueListLocal[elemListLastIndex]}
                        <Button icon={showAllLines ? "pi pi-angle-double-left" : "pi pi-angle-double-right"} onClick={() => setShowAllLines(!showAllLines)} className="x-button-multiline-expand-collapse"/>
                    </div>;
                // if there is some problem with the above, this should be used:
                // elemList[elemListLastIndex] =
                //     <div className="flex flex-row flex-wrap">
                //         <div key={elemListLastIndex}>{valueListLocal[elemListLastIndex]}</div>
                //         <Button icon={showAllLines ? "pi pi-angle-double-left" : "pi pi-angle-double-right"} onClick={() => setShowAllLines(!showAllLines)}
                //                 className="x-button-multiline-expand-collapse"/>
                //     </div>;
            }
        }
        valueResult = <div className={props.multilineContent ? "x-multiline-content" : undefined}>{elemList}</div>;
    }

    return valueResult;
}
