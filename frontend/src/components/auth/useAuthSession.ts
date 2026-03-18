import {Utils} from "../../utils/Utils";
import { AuthSession } from "./AuthSession";

// TODO - replace using Utils by react context + context provider (using useState) - see AuthSession.ts
export function useAuthSession(): {session: AuthSession | null; setSession: (session: AuthSession | null) => void;} {

    const session: AuthSession | null = Utils.getAuthSession();

    const setSession: (session: AuthSession | null) => void = (session: AuthSession | null) => {
        Utils.setAuthSession(session);
    };

    return {session, setSession};
}
