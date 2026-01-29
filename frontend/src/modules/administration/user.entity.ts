export interface User {
    id: number;
    username: string;
    password: string;
    name: string;
    enabled: boolean;
    admin: boolean;
    modifDate: Date;
    modifUser: User;
    version: number;
}