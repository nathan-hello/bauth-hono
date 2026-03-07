import { copy } from "@/lib/copy";
import { auth } from "@/server/auth";

export function OauthButtons({ formAction }: { formAction: string }) {
    if (!auth.options.socialProviders.apple.enabled && !auth.options.socialProviders.google.enabled) {
        return null;
    }
    return (
        <div class="flex flex-col w-full gap-3 justify-center items-center ">
            <div class="border-t border-border py-2 w-full" />
            {auth.options.socialProviders.google.enabled && <GoogleButton formAction={formAction} />}
            {auth.options.socialProviders.apple.enabled && <AppleButton formAction={formAction} />}
        </div>
    );
}

// https://developers.google.com/identity/branding-guidelines?hl=en#g+signin-social-scopes
function GoogleButton({ formAction }: { formAction: string }) {
    return (
        <form method="post" action={formAction}>
            <input type="hidden" name="action" value="oauth" />
            <input type="hidden" name="provider" value="google" />
            <button class="gsi-material-button" style="width:400">
                <div class="gsi-material-button-state"></div>
                <div class="gsi-material-button-content-wrapper">
                    <div class="gsi-material-button-icon">
                        <svg
                            version="1.1"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 48 48"
                            xmlns:xlink="http://www.w3.org/1999/xlink"
                            style="display: block;"
                        >
                            <path
                                fill="#EA4335"
                                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                            ></path>
                            <path
                                fill="#4285F4"
                                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                            ></path>
                            <path
                                fill="#FBBC05"
                                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                            ></path>
                            <path
                                fill="#34A853"
                                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                            ></path>
                            <path fill="none" d="M0 0h48v48H0z"></path>
                        </svg>
                    </div>
                    <span class="gsi-material-button-contents">{copy.oauth.login_prompt}{" "}{copy.oauth.providers.google}</span>
                    <span style="display: none;">{copy.oauth.login_prompt}{" "}{copy.oauth.providers.google}</span>
                </div>
            </button>
        </form>
    );
}

// Taken by mounting the following element onto the dom:
//  <script
//    type="text/javascript"
//    src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
//  ></script>
//  <div
//     id="appleid-signin"
//     data-color="black"
//     data-border="true"
//     data-type="sign-in"
//     data-height="48px"
//     data-width="300px"
//  ></div>
//
// Then copying the OuterHTML and converting that to jsx
// The beginning <a> tag was not in the original element.
function AppleButton({ formAction }: { formAction: string }) {
    return (
        <form method="post" action={formAction} class="cursor-pointer select-none">
            <input type="hidden" name="action" value="oauth" />
            <input type="hidden" name="provider" value="apple" />
            <button type="submit" style="all: unset; cursor: pointer;">
                <div
                    style="font-synthesis: none; -moz-font-feature-settings: kern; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; width: 300px; height: 48px; min-width: 130px; max-width: 375px; min-height: 30px; max-height: 64px; position: relative; letter-spacing: initial;"
                    role="button"
                    tabindex={0}
                    aria-label="Sign in with Apple"
                >
                    <div style=" padding-right: 8%; padding-left: 8%; position: absolute; box-sizing: border-box; width: 100%; height: 100%;">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            style="pointer-events: none; overflow: visible;"
                            width="100%"
                            height="100%"
                        >
                            <g>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    style="overflow: visible;"
                                    width="100%"
                                    height="50%"
                                    y="25%"
                                    viewBox="0 -11 111.046875 14"
                                    fill="#fff"
                                >
                                    <defs>
                                        <style
                                            dangerouslySetInnerHTML={{
                                                __html: `
                                         @font-face {
                                           font-family: "applied-button-font-0";
                                           src: url(data:application/x-font-woff;charset=utf-8;base64,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) format("woff")
                                         }
                                      `,
                                            }}
                                        ></style>
                                    </defs>
                                    <text
                                        font-size="12px"
                                        textLength="111.046875"
                                        font-family="applied-button-font-0"
                                        direction="ltr"
                                    >
                                    {/*  Sign in with Apple*/}
                                        {copy.oauth.login_prompt}{" "}{copy.oauth.providers.apple}
                                    </text>
                                </svg>
                            </g>
                        </svg>
                    </div>
                    <div style=" padding: 1px; width: 100%; height: 100%; box-sizing: border-box;">
                        <svg xmlns="http://www.w3.org/2000/svg" style=" overflow: visible;" width="100%" height="100%">
                            <rect
                                width="100%"
                                height="100%"
                                ry="15%"
                                fill="#000"
                                stroke="black"
                                stroke-width="1"
                                stroke-linecap="round"
                            ></rect>
                        </svg>
                    </div>
                </div>
            </button>
        </form>
    );
}

function OauthViaScripts() {
    return (
        <div class="flex flex-col w-full justify-center items-center">
            <AppleScript />
            <GoogleScript />
        </div>
    );
}

function AppleScript() {
    return (
        <>
            <script
                type="text/javascript"
                src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
            ></script>
            <div
                id="appleid-signin"
                data-color="black"
                data-border="true"
                data-type="sign-in"
                data-height="48px"
                data-width="300px"
            ></div>{" "}
        </>
    );
}

function GoogleScript() {
    return (
        <>
            <div
                id="g_id_onload"
                data-client_id="YOUR_GOOGLE_CLIENT_ID"
                data-login_uri="https://your.domain/your_login_endpoint"
                data-auto_prompt="false"
            ></div>
            <div
                class="g_id_signin"
                data-type="standard"
                data-size="large"
                data-theme="outline"
                data-text="sign_in_with"
                data-shape="rectangular"
                data-logo_alignment="left"
            ></div>
            <script src="https://accounts.google.com/gsi/client" async></script>
        </>
    );
}
