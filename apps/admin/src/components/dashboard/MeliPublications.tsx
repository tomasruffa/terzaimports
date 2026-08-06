'use client'

import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'

export interface MeliListing {
  meli_item_id: string
  title: string
  price: number
  status: string
  listing_label: string
  listing_type_id?: string
  available_quantity?: number
  permalink?: string | null
  thumbnail?: string | null
}

export interface MeliPublicationGroup {
  user_product_id: string | null
  family_id?: string | number | null
  family_name: string
  title: string
  meli_item_ids?: string[]
  listings: MeliListing[]
  listings_count: number
  is_variant_group: boolean
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}

function shortMeliId(id: string) {
  return id.replace(/^MLA/, '#')
}

function statusLabel(status: string) {
  if (status === 'active') return 'Activa'
  if (status === 'paused') return 'Inactiva'
  if (status === 'under_review') return 'En revisión'
  if (status === 'closed') return 'Cerrada'
  return status
}

function statusClass(status: string) {
  if (status === 'active') return 'bg-green-500/15 text-green-400'
  if (status === 'paused') return 'bg-yellow-500/15 text-yellow-400'
  if (status === 'under_review') return 'bg-blue-500/15 text-blue-300'
  return 'bg-terza-gray/15 text-terza-gray'
}

function publicationSummary(groups: MeliPublicationGroup[], listingsCount?: number) {
  const pubs = groups.length
  const listings = listingsCount ?? groups.reduce((n, g) => n + g.listings.length, 0)
  if (pubs === 0) return null
  if (pubs === 1 && listings > 1) return `1 pub. · ${listings} variantes`
  if (pubs > 1 && listings > pubs) return `${pubs} pub. · ${listings} listings`
  return `${pubs} publicación${pubs > 1 ? 'es' : ''}`
}

export function MeliPublicationsBadge({
  groups,
  listingsCount,
}: {
  groups: MeliPublicationGroup[]
  listingsCount?: number
}) {
  const label = publicationSummary(groups, listingsCount)
  if (!label) return <span className="text-terza-gray text-xs">—</span>
  return (
    <span className="bg-yellow-500/15 text-yellow-400 text-xs px-2 py-0.5 rounded-full">
      {label}
    </span>
  )
}

export function MeliPublicationsExpandable({
  groups,
  listingsCount,
  expanded,
  onToggle,
}: {
  groups: MeliPublicationGroup[]
  listingsCount?: number
  expanded: boolean
  onToggle: () => void
}) {
  if (!groups.length) return <span className="text-terza-gray text-xs">—</span>

  const hasVariants = groups.some((g) => g.is_variant_group) || groups.length > 1

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1.5 text-left"
    >
      {hasVariants ? (
        expanded ? (
          <ChevronDown size={14} className="text-terza-gray shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-terza-gray shrink-0" />
        )
      ) : null}
      <MeliPublicationsBadge groups={groups} listingsCount={listingsCount} />
    </button>
  )
}

export function MeliPublicationsDetail({ groups }: { groups: MeliPublicationGroup[] }) {
  if (!groups.length) return null

  return (
    <div className="space-y-3 py-2">
      {groups.map((group) => {
        const ids = group.meli_item_ids || group.listings.map((l) => l.meli_item_id)

        return (
          <div
            key={group.user_product_id || group.family_id || group.listings[0]?.meli_item_id}
            className="rounded-lg border border-terza-gray-dark/30 bg-terza-navy/50 p-3"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="text-white text-sm font-medium line-clamp-2">
                  {group.family_name || group.title}
                </p>
                <p className="text-terza-gray/80 text-xs font-mono mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                  {ids.map((id) => (
                    <span key={id}>{shortMeliId(id)}</span>
                  ))}
                </p>
              </div>
              {group.is_variant_group && (
                <span className="text-terza-gray text-xs shrink-0">
                  {group.listings_count} variantes
                </span>
              )}
            </div>

            <ul className="space-y-1.5">
              {group.listings.map((listing) => (
                <li
                  key={listing.meli_item_id}
                  className="flex items-center justify-between gap-3 text-xs py-1.5 px-2 rounded bg-terza-navy-light/40"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-white font-medium">{formatMoney(listing.price)}</span>
                    <span className="text-terza-gray mx-1.5">·</span>
                    <span className="text-terza-blue-bright">{listing.listing_label}</span>
                    <p className="text-terza-gray/60 font-mono mt-0.5">
                      {shortMeliId(listing.meli_item_id)}
                      {listing.available_quantity != null && (
                        <span className="text-terza-gray/50 ml-2">
                          stock ML: {listing.available_quantity}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusClass(listing.status)}`}>
                      {statusLabel(listing.status)}
                    </span>
                    {listing.permalink && (
                      <a
                        href={listing.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-terza-gray hover:text-white"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
