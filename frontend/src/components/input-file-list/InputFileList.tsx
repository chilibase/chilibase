import React, {createRef} from "react";
import {Component} from "react";
import {FileUpload, type FileUploadHandlerEvent} from "primereact/fileupload";
import {FormBase} from "../form";
import type {Assoc, Entity} from "../../common/EntityMetadata";
import {Utils} from "../../utils/Utils";
import type {EntityRow} from "../../common/types";
import {Button, ButtonIconNarrow} from "../button";
import {numberAsUI} from "../../common/UtilsConversions";
import {localeOption} from "../locale/Locale";
import type {FileJsonField} from "../../common/lib-api";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";
import type {FileMeta} from "../../modules/administration/file-meta.entity";

export interface InputFileListProps {
    form: FormBase;
    assocField: string;
    label?: string;
    chooseLabel?: string;
    readOnly?: boolean;
    saveDest: "fileSystem" | "database";
    subdir?: string; // subdirectory, where to save uploaded file (for the case saveDest === "fileSystem")
    maxFileSize?: number; // maximum file size allowed in bytes
}

// notice: in skch there is new version XInputFileList2 and that version don´t use fetch api because fetch api does not support progress bar
export class InputFileList extends Component<InputFileListProps> {

    public static defaultProps = {
        saveDest: "fileSystem"
    };

    fileUploadRef: any;

    props: InputFileListProps;
    entity: string;
    idField: string;
    fileMetaField: string;

    constructor(props: InputFileListProps) {
        super(props);

        this.fileUploadRef = createRef();

        this.props = props;
        const xEntityForm: Entity = UtilsMetadataCommon.getEntity(props.form.getEntity());
        const xAssocToMany: Assoc = UtilsMetadataCommon.getAssocToMany(xEntityForm, props.assocField);
        this.entity = xAssocToMany.entityName;
        const xEntity = UtilsMetadataCommon.getEntity(this.entity);
        this.idField = xEntity.idField;
        this.fileMetaField = UtilsMetadataCommon.getAssocToOneByAssocEntity(xEntity, 'FileMeta').name;

        this.onDownloadFile = this.onDownloadFile.bind(this);
        this.onRemoveFile = this.onRemoveFile.bind(this);
        this.uploadHandler = this.uploadHandler.bind(this);

        const fieldFilename = `${props.assocField}.${this.fileMetaField}.filename`;
        props.form.addField(fieldFilename);
    }

    async uploadHandler(event: FileUploadHandlerEvent) {
        //const file = event.files[0];

        const endpoint: string = this.props.saveDest === 'fileSystem' ? 'x-upload-file-into-file-system' : 'x-upload-file-into-db';

        for (const file of event.files) {
            // we check the size - we do it here, because when we set maxFileSize on the FileUpload component, a too large file is not even sent here into the handler
            if (this.props.maxFileSize !== undefined && file.size > this.props.maxFileSize) {
                alert(localeOption('fileUploadSizeToBig', {fileName: file.name, fileSize: InputFileList.sizeInMB(file.size), maxFileSize: InputFileList.sizeInMB(this.props.maxFileSize)}))
                continue; // we go to the next file
            }
            // we upload the file to the server, a FileMeta row is inserted there and this inserted row comes here and we write it into the list form.object.<assocField>
            const jsonFieldValue: FileJsonField = {
                filename: file.name,
                subdir: this.props.subdir,
                modifDate: new Date(),
                modifUser: Utils.getAuthSession()?.user?.id
            }
            let fileMeta: FileMeta;
            try {
                fileMeta = await Utils.fetchFile(endpoint, jsonFieldValue, file);
            }
            catch (e) {
                Utils.showErrorMessage(localeOption('fileUploadFailed', {fileName: file.name}), e);
                this.fileUploadRef.current.clear(); // we empty the hidden input, so the user can enter files again
                return; // we abort the upload of this and further files
            }

            const newFileItem: any = {};
            newFileItem[this.fileMetaField] = fileMeta;
            this.props.form.onTableAddRow(this.props.assocField, newFileItem, this.idField);
        }

        // deletes the entries in event.files (hidden input type="file"), causes the "+Pridat" button to open the dialog for selecting files
        this.fileUploadRef.current.clear();
    }

    static sizeInMB(size: number): string {
        const sizeInMB = size / (10 ** 6);
        return numberAsUI(sizeInMB, 2) + ' MB'; // we display 2 decimal places
    }

    async onDownloadFile(fileMeta: FileMeta) {
        Utils.downloadFile('x-download-file',{fileMetaId: fileMeta.id}, fileMeta.name);
    }

    async onRemoveFile(fileItem: any) {
        // note: we cannot delete the row on the backend, because if the user ends the form editing with the Cancel button (or leaves completely),
        // we must keep the original state of data/files in the database
        this.props.form.onTableRemoveRow(this.props.assocField, fileItem);
    }

    render() {
        const label = this.props.label ?? this.props.assocField;
        const readOnly = this.props.form.formReadOnlyBase(this.props.assocField) || (this.props.readOnly ?? false);

        const entityRow: EntityRow | null = this.props.form.state.entityRow;
        const fileItemList: any[] = entityRow !== null ? entityRow[this.props.assocField] : [];

        let elemList: any[] = [];
        for (const fileItem of fileItemList) {
            const fileMeta: FileMeta = fileItem[this.fileMetaField];
            // p-inputgroup puts child elements into a row (display:flex)
            // TODO - use XButtonIconSmall for the delete button - the problem is that we cannot (quickly) put class m-1 there
            elemList.push(
                <div key={fileItem[this.idField].toString()} className="p-inputgroup p-mb-1">
                    <Button label={fileMeta.name} onClick={() => this.onDownloadFile(fileMeta)}/>
                    <ButtonIconNarrow icon="pi pi-times" onClick={() => this.onRemoveFile(fileItem)} disabled={readOnly}/>
                </div>
            );
        }

        // the top div puts child elements one under another (standard display:block), they are aligned to the left
        return (
            <div>
                <label>{label}</label>
                {elemList}
                <FileUpload ref={this.fileUploadRef} mode="basic" multiple auto customUpload uploadHandler={this.uploadHandler}
                            chooseLabel={this.props.chooseLabel ?? localeOption('addRow')} className="m-1" disabled={readOnly}/>
            </div>
        );
    }
}
