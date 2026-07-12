const URL_REGEX = /(https?:\/\/[^\s]+)/g
const LINK_CLASS = 'underline break-all'
const TRAILING_PUNCT = /[.,;:!?)]+$/

function trimUrl(url: string) {
    return url.replace(TRAILING_PUNCT, '')
}

export function linkifyText(text: string, linkClassName = LINK_CLASS) {
    const parts = text.split(URL_REGEX)

    return parts.map((part, index) => {
        if (/^https?:\/\//.test(part)) {
            const href = trimUrl(part)
            return (
                <a
                    key={index}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClassName}
                    onClick={(e) => e.stopPropagation()}
                >
                    {href}
                </a>
            )
        }
        return part
    })
}