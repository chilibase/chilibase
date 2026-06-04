import {Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, VersionColumn} from "typeorm";
import {EnumValue} from "./enum-value.entity.js";
import {User} from "./user.entity.js";

@Entity({name: 'x_enum_type'})
export class EnumType {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({length: 64, nullable: false})
    code: string;

    @Column({length: 128, nullable: false})
    name: string;

    @Column({name: 'read_only', nullable: false})
    readOnly: boolean;

    @OneToMany('EnumValue', 'enumType', {cascade: ["insert", "update", "remove"]})
    enumValueList: EnumValue[];

    @Column({name: 'modif_date', type: 'timestamp', nullable: true})
    modifDate: Date;

    @ManyToOne(() => User, {nullable: true})
    @JoinColumn({ name: 'modif_x_user_id' })
    modifUser: User;

    @VersionColumn()
    version: number;
}
