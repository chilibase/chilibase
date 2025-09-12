import {Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, VersionColumn} from "typeorm";
import {XEnum} from "./x-enum.entity.js";
import {XUser} from "./x-user.entity.js";

@Entity({name: 'x_enum_enum'})
export class XEnumEnum {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({length: 64, nullable: false})
    code: string;

    @Column({length: 128, nullable: false})
    name: string;

    @Column({name: 'read_only', nullable: false})
    readOnly: boolean;

    @OneToMany('XEnum', 'xEnumEnum', {cascade: ["insert", "update", "remove"]})
    xEnumList: XEnum[];

    @Column({name: 'modif_date', type: 'timestamp', nullable: true})
    modifDate: Date;

    @ManyToOne(() => XUser, {nullable: true})
    @JoinColumn({ name: 'modif_x_user_id' })
    modifXUser: XUser;

    @VersionColumn()
    version: number;
}