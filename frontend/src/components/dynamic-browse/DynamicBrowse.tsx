import React, {Component} from "react";
import {SourceCodeLinkEntity} from "./SourceCodeLinkEntity";
import {EditColumnDialog, EditColumnDialogValues} from "./EditColumnDialog";
import * as _ from "lodash";
import {BrowseMeta, ColumnMeta} from "../../modules/administration";
import {UtilsMetadata} from "../../utils/UtilsMetadata";
import {Entity} from "../../common/EntityMetadata";
import {Utils} from "../../utils/Utils";
import {EditModeHandlers, LazyColumn, LazyDataTable} from "../lazy-data-table";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";
import {UtilsCommon} from "../../common/UtilsCommon";

export interface DynamicBrowseProps {
    entity: string;
    browseId?: string;
}

// browse created using this DynamicBrowse has columns saved in DB (entities BrowseMeta/ColumnMeta)
// and the browse can be (in runtime) switched into edit mode where the columns can be added/modified/removed
// proposal for change: BrowseMeta/ColumnMeta should be changed into one entity BrowseMeta and this entity should have jsonb field that contains all metadata (list of columns))
// warning - this component is (for now) not used in any project and was not tested after refactoring
// TODO - use extends DynamicBrowseBaseModif (like by CarForm)?
export class DynamicBrowse extends Component<DynamicBrowseProps> {

    state: {browseMeta: BrowseMeta; editMode: boolean; editColumnDialogOpened: boolean;};
    indexForAddColumn?: number;
    addColumn: boolean;
    editColumnDialogValues?: EditColumnDialogValues;

    constructor(props: DynamicBrowseProps) {
        super(props);
        console.log("************* DynamicBrowse const entity = " + this.props.entity);

        this.getBrowseMeta = this.getBrowseMeta.bind(this);

        const browseMeta: BrowseMeta = this.getBrowseMeta();
        this.state = {
            browseMeta: browseMeta,
            editMode: false,
            editColumnDialogOpened: false
        };

        this.addColumn = false;

        this.createDefaultBrowseMeta = this.createDefaultBrowseMeta.bind(this);
        this.onEditModeStart = this.onEditModeStart.bind(this);
        this.onEditModeSave = this.onEditModeSave.bind(this);
        this.onEditModeCancel = this.onEditModeCancel.bind(this);
        this.onAddColumn = this.onAddColumn.bind(this);
        this.editColumnDialogOnHide = this.editColumnDialogOnHide.bind(this);
        this.onEditColumn = this.onEditColumn.bind(this);
        this.onRemoveColumn = this.onRemoveColumn.bind(this);
        this.onMoveColumnLeft = this.onMoveColumnLeft.bind(this);
        this.onMoveColumnRight = this.onMoveColumnRight.bind(this);
        this.moveColumn = this.moveColumn.bind(this);
        this.onEdit = this.onEdit.bind(this);
    }

    getBrowseMeta(): BrowseMeta {
        let browseMeta: BrowseMeta = UtilsMetadata.getXBrowseMeta(this.props.entity, this.props.browseId);
        if (browseMeta === undefined) {
            browseMeta = this.createDefaultBrowseMeta();
        }
        return browseMeta;
    }

    createDefaultBrowseMeta(): BrowseMeta {
        const columnMetaList: ColumnMeta[] = [];
        const entityMeta: Entity = UtilsMetadataCommon.getEntity(this.props.entity);
        const fieldList = UtilsMetadataCommon.getFieldList(entityMeta);
        for (const entityField of fieldList) {
            columnMetaList.push({field: entityField.name, header: entityField.name, dropdownInFilter: false} as ColumnMeta);
        }
        return {id: undefined!, entity: this.props.entity, rows: 15, browseId: null, columnMetaList: columnMetaList};
    }

    onEditModeStart() {
        // zmeny budeme robit na klonovanych datach - aby sme sa vedeli cez cancel vratit do povodneho stavu
        let browseMetaCloned: BrowseMeta = _.cloneDeep(this.state.browseMeta);
        this.setState({browseMeta: browseMetaCloned, editMode: true});
    }

    async onEditModeSave() {
        // first we set columnOrder
        const browseMeta = this.state.browseMeta;
        let columnOrder = 0;
        for (const columnMeta of browseMeta.columnMetaList) {
            columnOrder++;
            columnMeta.columnOrder = columnOrder;
        }

        console.log(browseMeta);
        try {
            await Utils.post('saveRow', {entity: "XBrowseMeta", object: browseMeta});
        }
        catch (e) {
            Utils.showErrorMessage("Save row XBrowseMeta failed.", e);
            return; // zostavame v edit mode
        }

        // zmeny ulozime aj do cache formularov
        UtilsMetadata.setXBrowseMeta(this.props.entity, this.props.browseId, browseMeta);
        this.setState({editMode: false});
    }

    onEditModeCancel() {
        // vratime formular z cache, resp. defaultny formular
        const browseMeta: BrowseMeta = this.getBrowseMeta();
        this.setState({editMode: false, browseMeta: browseMeta});
    }

    onAddColumn(field: string) {
        console.log("onAddColumn: " + field);

        this.indexForAddColumn = this.getIndexForColumn(field);
        this.addColumn = true;
        this.editColumnDialogValues = {field: "", header: "", dropdownInFilter: false}; // values are used for dialog initialization
        this.setState({editColumnDialogOpened: true});
    }

    editColumnDialogOnHide(editColumnDialogValues: EditColumnDialogValues | null) {
        if (editColumnDialogValues !== null) {
            if (this.indexForAddColumn !== undefined) {
                const browseMeta = this.state.browseMeta;
                if (this.addColumn) {
                    browseMeta.columnMetaList.splice(this.indexForAddColumn + 1, 0, {
                        field: editColumnDialogValues.field,
                        header: editColumnDialogValues.header,
                        dropdownInFilter: editColumnDialogValues.dropdownInFilter,
                    } as ColumnMeta);
                }
                else {
                    const columnMeta: ColumnMeta = browseMeta.columnMetaList[this.indexForAddColumn];
                    columnMeta.header = editColumnDialogValues.header;
                    columnMeta.dropdownInFilter = editColumnDialogValues.dropdownInFilter;
                }
                // TODO - tu mozno treba setnut funkciu - koli moznej asynchronicite
                this.setState({browseMeta: browseMeta, editColumnDialogOpened: false});
                return;
            }
        }
        this.setState({editColumnDialogOpened: false});
    }

    onEditColumn(field: string) {
        console.log("onEditColumn: " + field);

        this.indexForAddColumn = this.getIndexForColumn(field);
        const browseMeta = this.state.browseMeta;
        if (this.indexForAddColumn !== undefined) {
            const columnMeta: ColumnMeta = browseMeta.columnMetaList[this.indexForAddColumn];
            this.addColumn = false;
            this.editColumnDialogValues = {field: columnMeta.field, header: columnMeta.header, dropdownInFilter: columnMeta.dropdownInFilter ?? false}; // values are used for dialog initialization
            this.setState({editColumnDialogOpened: true});
        }
    }

    onRemoveColumn(field: string) {
        console.log("onRemoveColumn: " + field);
        const index = this.getIndexForColumn(field);
        if (index !== undefined) {
            const browseMeta = this.state.browseMeta;
            browseMeta.columnMetaList.splice(index, 1);
            // TODO - tu mozno treba setnut funkciu - koli moznej asynchronicite
            this.setState({browseMeta: browseMeta});
        }
    }

    onMoveColumnLeft(field: string) {
        this.moveColumn(field, -1);
    }

    onMoveColumnRight(field: string) {
        this.moveColumn(field, 1);
    }

    moveColumn(field: string, offset: -1 | 1) {
        const index = this.getIndexForColumn(field);
        if (index !== undefined) {
            const browseMeta = this.state.browseMeta;
            UtilsCommon.arrayMoveElement(browseMeta.columnMetaList, index, offset);
            // TODO - tu mozno treba setnut funkciu - koli moznej asynchronicite
            this.setState({browseMeta: browseMeta});
        }
    }

    getIndexForColumn(field: string): number | undefined {
        let searchedIndex: number | undefined = undefined;
        const browseMeta = this.state.browseMeta;
        for (const [index, columnMeta] of browseMeta.columnMetaList.entries()) {
            if (columnMeta.field.localeCompare(field) === 0) {
                searchedIndex = index;
                break;
            }
        }
        return searchedIndex;
    }

    onEdit(selectedRow: any) {

        const formElement = Utils.getAppForm(this.props.entity);
        if (formElement !== undefined) {
            const entityMeta: Entity = UtilsMetadataCommon.getEntity(this.props.entity);
            const id = selectedRow[entityMeta.idField];
            // we add property id={selectedRow.<id>} into formElement
            const formElementCloned = React.cloneElement(formElement, {id: id}, formElement.children);
            // openForm pridavame automaticky v XFormNavigator3 pri renderovani komponentu
            (this.props as any).openForm(formElementCloned);
        }
        else {
            console.log(`DynamicBrowse entity = ${this.props.entity}: form not found/registered.`);
        }
    }

    render() {
        const browseMeta = this.state.browseMeta;
        const editModeHandlers: EditModeHandlers = {
            onStart: this.onEditModeStart,
            onSave: this.onEditModeSave,
            onCancel: this.onEditModeCancel,
            onAddColumn: this.onAddColumn,
            onEditColumn: this.onEditColumn,
            onRemoveColumn: this.onRemoveColumn,
            onMoveColumnLeft: this.onMoveColumnLeft,
            onMoveColumnRight: this.onMoveColumnRight
        }
        // for demo example classes
        let entitySourceCodeLink;
        if (browseMeta.entity === "Brand") {
            entitySourceCodeLink = <SourceCodeLinkEntity sourceCodeFile="brand.entity.ts"/>;
        }
        else if (browseMeta.entity === "Car") {
            entitySourceCodeLink = <SourceCodeLinkEntity sourceCodeFile="car.entity.ts"/>;
        }
        let formSourceCode;
        if (entitySourceCodeLink !== undefined) {
            formSourceCode =
                <div className="flex justify-content-center mt-3">
                    <span className="source-code-link">Form is saved in DB (Administration - Browses)</span>
                </div>;
        }
        return (
            <div>
                <LazyDataTable entity={browseMeta.entity} rows={browseMeta.rows ?? undefined} editMode={this.state.editMode} editModeHandlers={editModeHandlers} onEdit={this.onEdit} displayed={(this.props as any).displayed}>
                    {browseMeta.columnMetaList.map(function (columnMeta: ColumnMeta, index: number) {
                            return (<LazyColumn key={index} field={columnMeta.field} header={columnMeta.header} dropdownInFilter={columnMeta.dropdownInFilter} align={columnMeta.align as "center" | "left" | "right" | undefined} width={columnMeta.width}/>);
                        }
                    )}
                </LazyDataTable>
                {formSourceCode}
                {entitySourceCodeLink}
                <EditColumnDialog dialogOpened={this.state.editColumnDialogOpened} entity={browseMeta.entity} addColumn={this.addColumn} editColumnDialogValues={this.editColumnDialogValues} onHideDialog={this.editColumnDialogOnHide}/>
            </div>
        );
    }
}
