import React, {useEffect, useState} from "react";
import {Button} from "primereact/button";
import {SplitButton} from "primereact/splitbutton";
import {MenuItem} from "primereact/menuitem";
import {XtDocTemplate} from "./xt-doc-template";
import {XUtils} from "../../components/XUtils";
import {UtilsCommon} from "../../common/UtilsCommon";
import {RunDocTemplateRequest} from "../../common/lib-api";
import {xLocaleOption} from "../../components/XLocale";

// TODO - DocTemplateButton is missing endpoint 'xt-run-doc-template' for this moment (endpoint was not moved to backend lib)
export const DocTemplateButton = (props: {
    entity: string;
    rowId: number | undefined;
    docTemplates?: (entity: string) => Promise<XtDocTemplate[]>; // function returning list of templates that can be used by user (for the case if we need project specific way of fetching templates)
}) => {

    const [docTemplateList, setDocTemplateList] = useState<XtDocTemplate[]>([]);

    // parameter [] - works like componentDidMount
    useEffect(() => {
        loadDocTemplates();
    },[]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadDocTemplates = async () => {
        let docTemplateListLocal: XtDocTemplate[];
        if (props.docTemplates) {
            docTemplateListLocal = await props.docTemplates(props.entity);
        }
        else {
            // default
            docTemplateListLocal = await XUtils.fetchRows('XtDocTemplate', UtilsCommon.createCustomFilter(`[entity] = '${props.entity}' AND [availableInForms] = TRUE`), "label", ["templateXFile.name"]);
        }
        setDocTemplateList(docTemplateListLocal);
    }

    const onClickButton = async (xtDocTemplate: XtDocTemplate) => {

        // in XLazyDataTable if no row is selected
        if (!props.rowId) {
            alert(xLocaleOption('pleaseSelectRow'));
            return;
        }

        const xtRunDocTemplateRequest: RunDocTemplateRequest = {docTemplateId: xtDocTemplate.id, rowId: props.rowId!, user: XUtils.getXToken()?.user};

        // TODO - pridat id-cko do nazvu? alebo na XtDocTemplate vytvorit nejaky atribut pre nazov suboru vo forme Klient-{klient.meno}-{klient.priezvisko}.xlsx
        // ale to by chcelo vytvorit ten nazov v service (po tom co bude nacitany row) a nejako ho dostat sem
        // TODO - endpoint 'xt-run-doc-template' was still not moved to backend lib (from project)
        XUtils.downloadFile('xt-run-doc-template', xtRunDocTemplateRequest, xtDocTemplate.templateXFile.name);
    }

    if (docTemplateList.length === 0) {
        return null;
    }
    else if (docTemplateList.length === 1) {
        // simple button
        const docTemplate: XtDocTemplate = docTemplateList[0];
        return (
            <Button icon="pi pi-file-export" label={docTemplate.label} onClick={() => onClickButton(docTemplate)} className="m-1"/>
        );
    }
    else {
        // split button
        const docTemplate0: XtDocTemplate = docTemplateList[0];
        const items: MenuItem[] = [];
        for (let index: number = 1; index < docTemplateList.length; index++) {
            const docTemplate: XtDocTemplate = docTemplateList[index];
            items.push({icon: "pi pi-file-export", label: docTemplate.label, command: () => onClickButton(docTemplate)});
        }
        return (
            <SplitButton icon="pi pi-file-export" label={docTemplate0.label} onClick={() => onClickButton(docTemplate0)} model={items} className="m-1"/>
        );
    }
}
