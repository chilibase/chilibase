// TODO - refactor - create app context (using react context), all this stuff will be set after login and available via hook in the tree component
// now, this stuff is available via Utils, so be sure that the new approach is also available everywhere where Utils.getAuthSession() is used
// this new hook shoud be used:
// const { session, setSession } = useAuthSession();
// in the future - global variable in Utils (Utils.setAuthSession/Utils.getAuthSession) should be replaced by react context + context provider (using useState)

// react context is thing that enables using this authSession (or generally some state) in all component tree and after change (calling setSession)
// the react changes the proper components automatically
export interface AuthSession {
    accessToken: string | (() => Promise<string>); // used by Auth0/MSEntraID/Local authentication
    user?: any; // User - current user, set after login, used for example to set field modifUser
    logout?: () => void; // logout method, set after login, used after click on menu item logout
}

