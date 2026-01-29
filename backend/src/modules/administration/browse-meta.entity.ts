import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {ColumnMeta} from "./column-meta.entity.js";

@Entity('x_browse_meta')
export class BrowseMeta {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({length: 64, nullable: false})
    entity: string;

    @Column({name: 'browse_id', length: 64, nullable: true})
    browseId: string | null;

    @Column({width: 6, nullable: true})
    rows: number | null;

    @OneToMany('ColumnMeta', 'browseMeta', {cascade: ["insert", "update", "remove"]})
    columnMetaList: ColumnMeta[];
}