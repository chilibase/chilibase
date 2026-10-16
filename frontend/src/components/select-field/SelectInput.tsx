import React, {Component} from "react";
import {Dropdown, type DropdownChangeEvent} from "primereact/dropdown";
import {Utils} from "../../utils/Utils";
import type {CustomFilter} from "../../common/FindParam";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";

export interface SelectInputProps {
    id?: string;
    entity: string;
    displayField: string;
    sortField?: string;
    value: any | null;
    onChange: (value: any | null) => void;
    readOnly?: boolean;
    isNotNull?: boolean;
    error?: string;
    filter?: CustomFilter;
}

// general SelectInput whose parameter is entity, displays rows of the given entity, after selection returns a row of the given entity
// the ambition is to use it everywhere - in the form, in filters, in the form table, directly by the application programmer
// it would be possible to also extract SelectInputBase, which would receive options as a parameter (it would be independent of the DB), for now we do not make it,
// the probability of needing SelectInputBase is low
// in the future it is planned to use a cache for options (it would be filled when opening XFormBase*) - this is important mainly for dropdowns in the form table (and also for the dynamic filter in the form - the object is loaded later than the options)
// it would also be nice to support a dynamic filter (in the form) - but that would require pulling options up into the form state
// the question is whether to use only XAutoComplete everywhere and drop Dropdown
export class SelectInput extends Component<SelectInputProps> {

    protected idField: string;

    state: {
        options: any[];
    };

    constructor(props: SelectInputProps) {
        super(props);

        this.idField = UtilsMetadataCommon.getEntity(this.props.entity).idField;

        this.state = {
            options: []
        };

        this.onChange = this.onChange.bind(this);
    }

    componentDidMount() {
        this.loadOptions();
    }

    async loadOptions() {
        let options: any[] = await Utils.fetchRows(this.props.entity, this.props.filter, this.props.sortField ?? this.props.displayField);
        if (this.props.isNotNull === undefined || !this.props.isNotNull) {
            // we add an empty item
            options.splice(0, 0, {[this.idField]: null, [this.props.displayField]: ""}); // null item
        }
        this.setState({options: options});
    }

    onChange(e: DropdownChangeEvent) {
        let value: any | null;
        // special null item, id field null
        if (e.value[this.idField] === null) {
            value = null;
        } else {
            value = e.value;
        }
        this.props.onChange(value);
    }

    render() {
        // TODO - it might not be a bad idea to use InputText if readOnly === true (only the arrow (expander) would be missing) and it would be possible to copy-paste
        // properties on Dropdown: readOnly grays out, disabled makes selecting an item impossible
        return (
            <Dropdown id={this.props.id} options={this.state.options} optionLabel={this.props.displayField} dataKey={this.idField}
                      value={this.props.value} onChange={this.onChange}
                      readOnly={this.props.readOnly} disabled={this.props.readOnly} {...Utils.createTooltipOrErrorProps(this.props.error)}/>
        );
    }
}
