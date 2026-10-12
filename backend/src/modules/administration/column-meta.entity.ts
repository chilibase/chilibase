import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {BrowseMeta} from "./browse-meta.entity.js";
import {NumberWidth} from "../../entity-metadata/NumberWidth.js";

@Entity('x_column_meta')
export class ColumnMeta {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({length: 64, nullable: false})
    field: string;

    @Column({length: 64, nullable: true})
    header: string;

    // enum 'left','center','right' (default null - means depends on type)
    @Column({length: 6, nullable: true})
    align: string;

    @Column({name: 'dropdown_in_filter', nullable: false})
    dropdownInFilter: boolean;

    @Column({length: 16, nullable: true})
    width: string;

    @NumberWidth(3)
    @Column({name: 'column_order', nullable: false})
    columnOrder: number;

    @ManyToOne('BrowseMeta', 'columnMetaList', {nullable: false})
    @JoinColumn({name: "x_browse_meta_id"})
    browseMeta: BrowseMeta;
}
