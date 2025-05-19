export class RedirectError extends Error {
    constructor(public readonly url: string) {
        super(`Redirect to ${url}`)
        this.name = 'RedirectError'
        this.url = url
    }
}