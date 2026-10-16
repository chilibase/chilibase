import React, {useEffect, useState} from "react";
import {Button as PrimeButton} from "primereact/button";
import {SplitButton} from "primereact/splitbutton";
import type {MenuItem} from "primereact/menuitem";
import type {XtDocTemplate} from "./xt-doc-template.entity";
import {Utils} from "../../utils/Utils";
import {UtilsCommon} from "../../common/UtilsCommon";
import type {RunDocTemplateRequest} from "../../common/lib-api";
import {localeOption} from "../../components/locale/Locale";

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
            docTemplateListLocal = await Utils.fetchRows('XtDocTemplate', UtilsCommon.createCustomFilter(`[entity] = '${props.entity}' AND [availableInForms] = TRUE`), "label", ["templateXFile.name"]);
        }
        setDocTemplateList(docTemplateListLocal);
    }

    const onClickButton = async (xtDocTemplate: XtDocTemplate) => {

        // in LazyDataTable if no row is selected
        if (!props.rowId) {
            alert(localeOption('pleaseSelectRow'));
            return;
        }

        const xtRunDocTemplateRequest: RunDocTemplateRequest = {docTemplateId: xtDocTemplate.id, rowId: props.rowId!, user: Utils.getAuthSession()?.user};

        // TODO - add the id into the name? or on XtDocTemplate create some attribute for the file name in the form Klient-{klient.meno}-{klient.priezvisko}.xlsx
        // but that would require creating that name in the service (after the row is loaded) and somehow getting it here
        // TODO - endpoint 'xt-run-doc-template' was still not moved to backend lib (from project)
        Utils.downloadFile('xt-run-doc-template', xtRunDocTemplateRequest, xtDocTemplate.templateXFile.name);
    }

    if (docTemplateList.length === 0) {
        return null;
    }
    else if (docTemplateList.length === 1) {
        // simple button
        const docTemplate: XtDocTemplate = docTemplateList[0];
        return (
            <PrimeButton icon="pi pi-file-export" label={docTemplate.label} onClick={() => onClickButton(docTemplate)} className="m-1"/>
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
