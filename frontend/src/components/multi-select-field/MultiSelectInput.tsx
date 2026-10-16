import React, {Component} from "react";
import type {Query} from "../../utils/types";
import {Utils} from "../../utils/Utils";
import type {DataTableSortMeta} from "primereact/datatable";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";
import {MultiSelect, type MultiSelectChangeEvent} from "primereact/multiselect";

// Base component for MultiSelectField - a similar level as AutocompleteInput, or SelectInput

export interface MultiSelectInputProps {
    value: any[];
    onChange: (value: any[]) => void;
    //options?: any[]; // if options are provided directly, optionsQuery is not used (TODO - I do not know if we need this, MultiSelect can be used directly in this case)
    optionsQuery?: Query; // must be specified if options are not provided
    displayField: string; // field displayed in the input (one of the fields of the object from value/options), can also be a path (e.g. <assoc>.<field>)
    //idField?: string; // id field (attribute name) of the object from value/suggestions - used if we have options provided directly (with optionsQuery we obtain idField according to the entity)
    maxSelectedLabels?: number;
    width?: string; // (still not implemented)
    scrollHeight?: string; // Maximum height of the options panel. (still not implemented)
    readOnly?: boolean;
    error?: string; // error message, if we want to mark the field as invalid
}

export class MultiSelectInput extends Component<MultiSelectInputProps> {

    public static defaultProps = {
        //scrollHeight: '15rem'   // primereact has 200px
    };

    protected idField: string;

    state: {
        options: any[];
    };

    constructor(props: MultiSelectInputProps) {
        super(props);

        if (!this.props.optionsQuery) {
            throw `MultiSelectInput.optionsQuery: unexpected error - prop optionsQuery is undefined`;
        }
        this.idField = UtilsMetadataCommon.getEntity(this.props.optionsQuery.entity).idField;

        this.state = {
            options: []
        };
    }

    componentDidMount() {
        this.loadOptions();
    }

    async loadOptions() {
        if (!this.props.optionsQuery) {
            throw `MultiSelectInput.optionsQuery: unexpected error - prop optionsQuery is undefined`;
        }
        const options: any[] = await Utils.fetchRows(
            this.props.optionsQuery.entity,
            Utils.evalFilter(this.props.optionsQuery.filter),
            this.getSortField(),
            this.props.optionsQuery.fields
        );
        this.setState({options: options});
    }

    getSortField(): string | DataTableSortMeta[] | undefined {
        let sortField: string | DataTableSortMeta[] | undefined = this.props.optionsQuery!.sortField;
        if (!sortField) {
            // as the default we use displayField
            sortField = this.props.displayField;
        }
        return sortField;
    }

    render() {
        // properties on Dropdown: readOnly grays out, disabled makes selecting an item impossible
        return (
            <MultiSelect options={this.state.options} optionLabel={this.props.displayField} dataKey={this.idField}
                         maxSelectedLabels={this.props.maxSelectedLabels} display="chip"
                         value={this.props.value} onChange={(e: MultiSelectChangeEvent) => this.props.onChange(e.value)}
                         readOnly={this.props.readOnly} disabled={this.props.readOnly} {...Utils.createTooltipOrErrorProps(this.props.error)}/>
        );
    }
}