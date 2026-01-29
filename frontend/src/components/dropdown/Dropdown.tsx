import React from "react";
import {FilterProp, FormComponent, FormComponentProps} from "../form";
import {Assoc} from "../../common/EntityMetadata";
import {XObject} from "../XObject";
import {DropdownForEntity} from "./DropdownForEntity";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";

export interface DropdownProps extends FormComponentProps {
    assocField: string; // can be also path (e.g. <assoc1>.<assoc2> - dropdown will run on <assoc2>)
    displayField: string;
    sortField?: string;
    filter?: FilterProp;
}

export class Dropdown extends FormComponent<DropdownProps> {

    protected xAssoc: Assoc;

    constructor(props: DropdownProps) {
        super(props);

        this.xAssoc = UtilsMetadataCommon.getAssocToOneByPath(UtilsMetadataCommon.getEntity(props.form.getEntity()), props.assocField);

        props.form.addField(props.assocField + '.' + props.displayField);
    }

    getField(): string {
        return this.props.assocField;
    }

    isNotNull(): boolean {
        return !this.xAssoc.isNullable;
    }

    getValue(): any | null {
        const assocObject: any | null = this.getValueFromObject();
        return assocObject;
    }

    render() {
        // POZOR!
        // this.getFilterBase(this.props.filter) - nefunguje dynamicky filter, lebo objekt potrebny vo funkcii this.props.filter sa nacitava az v XFormBase.componentDidMount()
        // a funkcia this.props.filter sa vola skor (pri vypocitavani atributu filter)
        // ani keby bola funkcia volana vo componentDidMount() tohto Dropdown, nepomohlo by to, tento componentDidMount() sa vola skor ako componentDidMount() parenta XFormBase
        // planuje sa to riesit bud zavedenim cache pre options alebo vytiahnutim options na uroven XFormBase
        return (
            <div className="field grid">
                <label htmlFor={this.props.assocField} className="col-fixed" style={this.getLabelStyle()}>{this.getLabel()}</label>
                <DropdownForEntity id={this.props.assocField} entity={this.xAssoc.entityName} displayField={this.props.displayField} sortField={this.props.sortField}
                                    value={this.getValue()} onChange={(value: any | null) => this.onValueChangeBase(value, this.props.onChange)}
                                    readOnly={this.isReadOnly()} isNotNull={this.isNotNull()} error={this.getError()} filter={this.getFilterBase(this.props.filter)}/>
            </div>
        );
    }
}

