import React from "react";

export const SourceCodeLinkEntity = (props: {sourceCodeFile: string}) => {
    return (
        <div className="flex justify-content-center">
            <a className="source-code-link" href={`https://github.com/chilibase/car-demo/blob/main/backend/src/model/${props.sourceCodeFile}`} target="_blank" rel="noopener noreferrer">Source code entity: {props.sourceCodeFile}</a>
        </div>
    );
}
