
const ShortCodes = {
    Provider: "p",
    Identifier: "i",
    Time: "t"
}

const Provider = {
    list: {
        YouTube: {
            name: "YouTube",
            shortCode: "yt",
            baseURI: "https://www.youtube.com",
            getTime: (uri) => { return parseInt(new URL(uri).searchParams.get('t')) || 0 },
            getIdentifier: (uri) => { return new URL(uri).searchParams.get('v') || "" },
            isURIValid: (uri) => { return new URL(uri).searchParams.has('v') || false },
            getUri: (resource) => {
                const uri = new URL("https://www.youtube.com");
                uri.pathname = "/watch";
                uri.searchParams.set('v', resource.identifier)
                uri.searchParams.set('t', resource.offset + "s")
                return uri.toString()
            }
        },
        YouTubeShare: {
            name: "YouTubeShare",
            shortCode: "yts",
            baseURI: "https://www.youtu.be",
            getTime: (uri) => { return parseInt(new URL(uri).searchParams.get('t')) || 0 },
            getIdentifier: (uri) => { return new URL(uri).pathname.substring(1) || "" },
            isURIValid: (uri) => { return new URL(uri).pathname.substring(1).length > 0 || false },
            getUri: (resource) => {
                const uri = new URL("https://youtu.be");
                uri.pathname = "/" + resource.identifier;
                uri.searchParams.set('t', resource.offset + "s")
                return uri.toString()
            }
        }
    },
    fromURI: (uri) => {
        const url = new URL(uri)
        const hostname = url.hostname
        const provider = Object.keys(Provider.list).find(providerName => {
            return Provider.list[providerName].baseURI.includes(hostname)
        })

        return provider ? Provider.list[provider] : undefined
    }
}

const Resource = {
    fromURI: (uri) => {
        const provider = Provider.fromURI(uri)

        if (!provider) {
            return undefined
        }

        if (!provider.isURIValid(uri)) {
            return undefined
        }

        return {
            provider: provider.name,
            identifier: provider.getIdentifier(uri),
            offset: provider.getTime(uri)
        }
    },
    toQueryParameters: (resource, now = getCurrentEpoch()) => {
        const provider = Provider.list[resource.provider]

        if (!provider) {
            return undefined
        }

        const { identifier, offset } = resource

        return [
            [ShortCodes.Provider, provider.shortCode].join('='),
            [ShortCodes.Identifier, identifier].join('='),
            [ShortCodes.Time, now - offset].join('=')
        ].join("&")
    },
    fromQueryParameters: (queryParameters, now = getCurrentEpoch()) => {
        const uri = new URL("https://localhost/?" + queryParameters)

        const providerCode = uri.searchParams.get(ShortCodes.Provider)


        const provider = Object.keys(Provider.list).find(providerName => {
            return Provider.list[providerName].shortCode == providerCode
        })

        if (!provider) {
            return undefined
        }

        const identifier = uri.searchParams.get(ShortCodes.Identifier)
        const offset = parseInt(uri.searchParams.get(ShortCodes.Time))
        return {
            provider: provider,
            identifier: identifier || "",
            offset: now - offset || 0
        }
    }
}

function getCurrentEpoch() {
    return Math.round(new Date().getTime() / 1000)
}

const inputField = document.querySelector('input.synclink')
const hint = document.querySelector('p.synclink')
const hrefURL = new URL(window.location.href)
if (hrefURL.search.length > 1) {
    let resource
    try {
        resource = Resource.fromQueryParameters(hrefURL.searchParams.toString())
    } catch (err) {
        hint.innerText = "❌ Synclink not able to redirect."
    }

    hint.innerText = "⏳ Taking you to the synchronized link..."
    hint.appendChild(document.createElement("br"))
    
    const providerUri = Provider.list[resource.provider].getUri(resource)
    const providerAnchor = getLink(providerUri)
    hint.appendChild(providerAnchor)
    window.location = providerUri
}

inputField.addEventListener("input", (event) => {
    hint.innerText = ""
    let resource
    try {
        resource = Resource.fromURI(event.target.value)
    } catch (err) {
        hint.innerText = "🤔 Unable to parse that link... Is it properly formatted?"
        return
    }

    if (!resource) {
        hint.innerText = "😓 I can't sync that yet. Check the supported providers list."
        return
    }

    const magicLink = new URL(window.location.href)
    magicLink.search = Resource.toQueryParameters(resource)

    var magicLinkOutput = document.createElement('textarea')
    magicLinkOutput.appendChild(document.createTextNode(magicLink.toString()))

    magicLinkOutput.addEventListener("click", (event) => {
        event.preventDefault()
        event.target.setSelectionRange(0, event.target.textLength)
        try {
            navigator.clipboard.writeText(event.target.value)
            hint.innerText = "✨ Copied link to clipboard."
        } catch (err) {
            hint.innerText = "❌ Failed to copy link to clipboard."
        }

    })

    const linkDiv = document.querySelector('div.synclink')
    const existingLink = document.querySelector('div.synclink textarea')
    hint.innerHTML = "👇 Here's your magic link! Anyone visiting this link will be automatically synchronized."
    if (existingLink) {
        linkDiv.replaceChild(magicLinkOutput, existingLink)
    } else {
        linkDiv.appendChild(magicLinkOutput)
    }
})

function getLink(uri) {
    const magicAnchor = document.createElement('a')
    magicAnchor.title = uri
    magicAnchor.href = uri
    magicAnchor.innerText = uri
    return magicAnchor
}
