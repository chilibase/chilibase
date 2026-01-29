// TODO - refactor - create app context (using react context), all this stuff will be set after login and available via hook in the tree component
// now, this stuff is available via XUtils, so be sure that the new approach is also available everywhere where XUtils.getXToken() is used
export interface XToken {
    accessToken?: string | (() => Promise<string>); // pouziva sa pri Auth0/MSEntraID/Local autentifikacii (should be required)
    user?: any; // User - aktualny user, nastavuje sa po logine, pouziva sa napr. na nastavenie atributu vytvoril/modifikoval
    logout?: () => void; // logout method, set after login, used after click on menu item logout
}
