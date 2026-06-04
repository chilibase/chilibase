import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";
import {Buffer} from "buffer";

@Entity({name: 'x_file_meta'})
export class FileMeta {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({length: 256, nullable: false})
    name: string;

    @Column({nullable: false})
    size: number;

    @Column({name: 'path_name', length: 256, nullable: true})
    pathName: string;

    // for mysql use type: 'longblob'
    // for postgres use type: 'bytea'
    // select: false - we do not want to select the attribute because can contain big data
    @Column({type: 'bytea', nullable: true, select: false})
    data: Buffer;

    // for mysql use type: 'datetime'
    // for postgres use type: 'timestamp'
    @Column({name: 'modif_date', type: 'timestamp', nullable: true})
    modifDate: Date;

    // here only simple attribute, because instead of framework entity User we often use in app some specific user entity (e.g. UserSkch)
    @Column({name: 'modif_x_user_id', nullable: true})
    modifUser: number;
}
