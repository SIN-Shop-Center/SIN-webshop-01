import NextLink, { type LinkProps } from 'next/link'
import { forwardRef } from 'react'

type AppLinkProps = LinkProps & React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }

const Link = forwardRef<HTMLAnchorElement, AppLinkProps>(({ prefetch = false, ...props }, ref) => {
  return <NextLink ref={ref} prefetch={prefetch} {...props} />
})

Link.displayName = 'AppLink'

export default Link
