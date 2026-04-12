import { useParams, Link } from 'react-router-dom';
import { useProperty, usePropertyImages, useAgentProfile } from '@/hooks/useProperties';
import { formatIndianPrice, formatArea, getPropertyTypeLabel } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Bed, Bath, Maximize, Compass, Building, Calendar, Phone, Share2, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { useState } from 'react';

export default function PropertyPresentation() {
  const { id } = useParams();
  const { data: property, isLoading } = useProperty(id);
  const { data: images = [] } = usePropertyImages(id);
  const { data: agent } = useAgentProfile();
  const [currentImage, setCurrentImage] = useState(0);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading property...</div></div>;
  if (!property) return <div className="min-h-screen flex items-center justify-center"><p>Property not found</p></div>;

  const allImages = images.length > 0
    ? images.map(i => i.image_url)
    : property.cover_image_url
      ? [property.cover_image_url]
      : [];

  const highlights = [
    property.bhk && { icon: Bed, label: `${property.bhk} BHK`, sub: 'Configuration' },
    property.carpet_area && { icon: Maximize, label: formatArea(property.carpet_area), sub: 'Carpet Area' },
    property.floor_number && { icon: Building, label: `Floor ${property.floor_number}${property.total_floors ? `/${property.total_floors}` : ''}`, sub: 'Floor' },
    property.facing && { icon: Compass, label: property.facing.replace('-', ' '), sub: 'Facing' },
    property.bedrooms && { icon: Bed, label: `${property.bedrooms}`, sub: 'Bedrooms' },
    property.bathrooms && { icon: Bath, label: `${property.bathrooms}`, sub: 'Bathrooms' },
    property.plot_area && { icon: Maximize, label: formatArea(property.plot_area), sub: 'Plot Area' },
    property.built_up_area && { icon: Maximize, label: formatArea(property.built_up_area), sub: 'Built-up Area' },
  ].filter(Boolean) as { icon: any; label: string; sub: string }[];

  const whatsappMsg = encodeURIComponent(
    `Hi! I'm interested in: ${property.title} - ${formatIndianPrice(property.price)} | ${property.locality}, ${property.city}. ${window.location.href}`
  );
  const whatsappUrl = agent?.whatsapp ? `https://wa.me/${agent.whatsapp}?text=${whatsappMsg}` : '#';

  const nextImage = () => setCurrentImage(i => (i + 1) % allImages.length);
  const prevImage = () => setCurrentImage(i => (i - 1 + allImages.length) % allImages.length);

  const shareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-[60vh] md:h-[70vh] bg-foreground/5">
        {allImages.length > 0 ? (
          <>
            <img src={allImages[currentImage]} alt={property.title}
              className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
            {allImages.length > 1 && (
              <>
                <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background p-2 rounded-full transition-colors">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background p-2 rounded-full transition-colors">
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-2">
                  {allImages.map((_, i) => (
                    <button key={i} onClick={() => setCurrentImage(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${i === currentImage ? 'bg-background' : 'bg-background/50'}`} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="text-8xl opacity-30">{property.property_type === 'flat' ? '🏢' : property.property_type === 'villa' ? '🏡' : property.property_type === 'plot' ? '📐' : '🏪'}</span>
          </div>
        )}

        {/* Back, brand, Share */}
        <div className="absolute top-4 left-4 right-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="justify-self-start">
            <Button variant="secondary" size="sm" asChild className="bg-background/80 backdrop-blur-sm">
              <Link to="/properties"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
            </Button>
          </div>
          <BrandLogo className="h-10 w-10 drop-shadow-md hidden sm:block" />
          <div className="justify-self-end">
            <Button variant="secondary" size="sm" onClick={shareLink} className="bg-background/80 backdrop-blur-sm">
              <Share2 className="h-4 w-4 mr-1" /> Share
            </Button>
          </div>
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-background">
          <Badge className="mb-3 bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] border-0 text-sm font-semibold px-3 py-1">
            {property.listing_type === 'sale' ? 'FOR SALE' : 'FOR RENT'}
          </Badge>
          <h1 className="font-display text-3xl md:text-5xl font-bold mb-2 drop-shadow-lg">{property.title}</h1>
          <div className="flex items-center gap-2 text-background/80 mb-3">
            <MapPin className="h-4 w-4" />
            <span>{property.locality}, {property.city}</span>
          </div>
          <p className="font-display text-3xl md:text-4xl font-bold text-[hsl(var(--gold))]">
            {formatIndianPrice(property.price)}
            {property.price_unit === 'per_sqft' && <span className="text-lg"> /sq.ft</span>}
            {property.price_unit === 'per_month' && <span className="text-lg"> /month</span>}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 space-y-12">
        {/* Highlights */}
        {highlights.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {highlights.map((h, i) => (
              <div key={i} className="bg-card border rounded-xl p-5 text-center hover:shadow-md transition-shadow">
                <h.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="font-semibold text-lg capitalize">{h.label}</p>
                <p className="text-xs text-muted-foreground">{h.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Property Details */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-4">Property Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <DetailRow label="Type" value={getPropertyTypeLabel(property.property_type)} />
            <DetailRow label="Listing" value={property.listing_type === 'sale' ? 'For Sale' : 'For Rent'} />
            {property.possession_status && <DetailRow label="Possession" value={property.possession_status === 'ready' ? 'Ready to Move' : 'Under Construction'} />}
            {property.property_age && <DetailRow label="Property Age" value={property.property_age} />}
            {property.furnishing && <DetailRow label="Furnishing" value={property.furnishing.replace('-', ' ')} />}
            {property.plot_dimensions && <DetailRow label="Dimensions" value={property.plot_dimensions} />}
            {property.land_type && <DetailRow label="Land Type" value={property.land_type.toUpperCase()} />}
            {property.commercial_type && <DetailRow label="Commercial Type" value={property.commercial_type} />}
            {property.parking_spots && <DetailRow label="Parking" value={`${property.parking_spots} spots`} />}
            {property.rera_number && <DetailRow label="RERA" value={property.rera_number} />}
          </div>
        </section>

        {/* Description */}
        {property.description && (
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">About This Property</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{property.description}</p>
          </section>
        )}

        {/* Amenities */}
        {property.amenities && property.amenities.length > 0 && (
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">Amenities & Features</h2>
            <div className="flex flex-wrap gap-2">
              {property.amenities.map(a => (
                <Badge key={a} variant="secondary" className="px-4 py-2 text-sm rounded-full">{a}</Badge>
              ))}
            </div>
          </section>
        )}

        {/* Location */}
        {property.address && (
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">Location</h2>
            <div className="flex items-start gap-3 p-4 bg-card border rounded-xl">
              <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{property.locality}, {property.city}</p>
                <p className="text-sm text-muted-foreground">{property.address}</p>
              </div>
            </div>
          </section>
        )}

        {/* Photo Gallery */}
        {allImages.length > 1 && (
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">Photo Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {allImages.map((url, i) => (
                <img key={i} src={url} alt={`${property.title} - ${i + 1}`}
                  className="w-full h-48 object-cover rounded-xl hover:opacity-90 transition-opacity cursor-pointer" onClick={() => setCurrentImage(i)} />
              ))}
            </div>
          </section>
        )}

        {/* Agent contact */}
        {agent && (
          <section className="bg-card border rounded-2xl p-6 md:p-8 text-center">
            <p className="text-muted-foreground text-sm mb-1">Listed by</p>
            {agent.name?.trim() ? (
              <h3 className="font-display text-xl font-bold">{agent.name}</h3>
            ) : null}
            {agent.tagline && <p className="text-muted-foreground text-sm">{agent.tagline}</p>}
            <div className="flex items-center justify-center gap-3 mt-4">
              {agent.phone && (
                <Button variant="outline" asChild>
                  <a href={`tel:${agent.phone}`}><Phone className="h-4 w-4 mr-1" /> Call</a>
                </Button>
              )}
              {agent.whatsapp && (
                <Button className="bg-[hsl(145,65%,42%)] hover:bg-[hsl(145,65%,36%)] text-[hsl(var(--success-foreground))]" asChild>
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    💬 WhatsApp
                  </a>
                </Button>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Floating WhatsApp CTA */}
      {agent?.whatsapp && (
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
          className="fixed bottom-6 right-6 bg-[hsl(145,65%,42%)] text-[hsl(var(--success-foreground))] px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2 font-medium z-50">
          💬 WhatsApp
        </a>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2 border-b last:border-0">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium capitalize">{value}</p>
    </div>
  );
}
