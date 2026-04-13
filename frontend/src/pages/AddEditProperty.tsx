import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProperty, useUpdateProperty, useProperty, usePropertyImages, uploadPropertyImage, deletePropertyImage, type PropertyImage } from '@/hooks/useProperties';
import { PROPERTY_TYPES, LISTING_TYPES, FACING_OPTIONS, FURNISHING_OPTIONS, AMENITIES_LIST, BHK_OPTIONS } from '@/lib/format';
import { isListingVideoUrl } from '@/lib/listingMedia';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Upload, X, Star, Check, Building2 } from 'lucide-react';

const STEPS = ['Basic Info', 'Specifications', 'Amenities & Features', 'Images / Video'];

export default function AddEditProperty() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { data: existing } = useProperty(id);
  const { data: existingImages = [] } = usePropertyImages(id);
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();

  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [form, setForm] = useState({
    title: '', property_type: 'flat', listing_type: 'sale',
    price: '', price_unit: 'total', city: '', locality: '', address: '',
    bhk: '', bedrooms: '', bathrooms: '', floor_number: '', total_floors: '',
    carpet_area: '', built_up_area: '', furnishing: '',
    plot_area: '', plot_dimensions: '', boundary_wall: false, land_type: '',
    commercial_type: '', parking_spots: '',
    facing: '', possession_status: '', property_age: '',
    amenities: [] as string[], rera_number: '', description: '',
    status: 'draft',
  });

  // Sync existing data once
  const [synced, setSynced] = useState(false);
  if (existing && !synced) {
    setForm({
      title: existing.title || '', property_type: existing.property_type,
      listing_type: existing.listing_type, price: String(existing.price || ''),
      price_unit: existing.price_unit || 'total', city: existing.city || '',
      locality: existing.locality || '', address: existing.address || '',
      bhk: String(existing.bhk || ''), bedrooms: String(existing.bedrooms || ''),
      bathrooms: String(existing.bathrooms || ''), floor_number: String(existing.floor_number || ''),
      total_floors: String(existing.total_floors || ''), carpet_area: String(existing.carpet_area || ''),
      built_up_area: String(existing.built_up_area || ''), furnishing: existing.furnishing || '',
      plot_area: String(existing.plot_area || ''), plot_dimensions: existing.plot_dimensions || '',
      boundary_wall: existing.boundary_wall || false, land_type: existing.land_type || '',
      commercial_type: existing.commercial_type || '', parking_spots: String(existing.parking_spots || ''),
      facing: existing.facing || '', possession_status: existing.possession_status || '',
      property_age: existing.property_age || '', amenities: existing.amenities || [],
      rera_number: existing.rera_number || '', description: existing.description || '',
      status: existing.status,
    });
    setImages(existingImages);
    setSynced(true);
  }

  if (existingImages.length > 0 && images.length === 0 && synced) {
    setImages(existingImages);
  }

  const updateField = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));
  const toggleAmenity = (a: string) =>
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(a) ? prev.amenities.filter(x => x !== a) : [...prev.amenities, a],
    }));

  const handleSubmit = async () => {
    if (!form.title || !form.price || !form.city || !form.locality) {
      toast.error('Please fill required fields: Title, Price, City, Locality');
      setStep(0);
      return;
    }
    const payload = {
      title: form.title.trim(), property_type: form.property_type, listing_type: form.listing_type,
      price: Number(form.price), price_unit: form.price_unit, city: form.city.trim(),
      locality: form.locality.trim(), address: form.address.trim() || null,
      bhk: form.bhk ? Number(form.bhk) : null, bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
      bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
      floor_number: form.floor_number ? Number(form.floor_number) : null,
      total_floors: form.total_floors ? Number(form.total_floors) : null,
      carpet_area: form.carpet_area ? Number(form.carpet_area) : null,
      built_up_area: form.built_up_area ? Number(form.built_up_area) : null,
      furnishing: form.furnishing || null, plot_area: form.plot_area ? Number(form.plot_area) : null,
      plot_dimensions: form.plot_dimensions || null, boundary_wall: form.boundary_wall,
      land_type: form.land_type || null, commercial_type: form.commercial_type || null,
      parking_spots: form.parking_spots ? Number(form.parking_spots) : null,
      facing: form.facing || null, possession_status: form.possession_status || null,
      property_age: form.property_age || null, amenities: form.amenities,
      rera_number: form.rera_number || null, description: form.description || null,
      status: form.status,
      cover_image_url: images.find(i => i.is_cover)?.image_url || images[0]?.image_url || null,
    };

    try {
      if (isEdit) {
        await updateProperty.mutateAsync({ id, ...payload });
        toast.success('Property updated!');
      } else {
        await createProperty.mutateAsync(payload);
        toast.success('Property created!');
      }
      navigate('/dashboard/properties');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    }
  };

  const handleImageUpload = useCallback(async (files: FileList | null) => {
    if (!files || !id) {
      if (!id) toast.error('Please save the property first before uploading media');
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const img = await uploadPropertyImage(file, id);
        setImages(prev => [...prev, img]);
      }
      toast.success('Media uploaded!');
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [id]);

  const handleDeleteImage = async (img: PropertyImage) => {
    await deletePropertyImage(img);
    setImages(prev => prev.filter(i => i.id !== img.id));
    toast.success('Media removed');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <h1 className="text-2xl font-display font-bold flex items-center gap-2">
        <Building2 className="h-8 w-8 shrink-0 text-primary" aria-hidden />
        {isEdit ? 'Edit Property' : 'Add New Property'}
      </h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors
              ${i === step ? 'bg-primary text-primary-foreground' : i < step ? 'bg-muted text-foreground' : 'bg-muted/50 text-muted-foreground'}`}>
            {i < step ? <Check className="h-3 w-3" /> : <span className="w-4 h-4 rounded-full border text-xs flex items-center justify-center">{i + 1}</span>}
            <span className="hidden sm:inline">{s}</span>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label>Property Title *</Label>
                <Input value={form.title} onChange={e => updateField('title', e.target.value)} placeholder="e.g., Luxurious 3BHK in Andheri West" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Property Type *</Label>
                  <Select value={form.property_type} onValueChange={v => updateField('property_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Listing Type *</Label>
                  <Select value={form.listing_type} onValueChange={v => updateField('listing_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LISTING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price (₹) *</Label>
                  <Input type="number" value={form.price} onChange={e => updateField('price', e.target.value)} placeholder="e.g., 4500000" />
                </div>
                <div>
                  <Label>Price Unit</Label>
                  <Select value={form.price_unit} onValueChange={v => updateField('price_unit', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total">Total Price</SelectItem>
                      <SelectItem value="per_sqft">Per Sq.Ft</SelectItem>
                      <SelectItem value="per_month">Per Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>City *</Label>
                  <Input value={form.city} onChange={e => updateField('city', e.target.value)} placeholder="e.g., Mumbai" />
                </div>
                <div>
                  <Label>Locality / Area *</Label>
                  <Input value={form.locality} onChange={e => updateField('locality', e.target.value)} placeholder="e.g., Andheri West" />
                </div>
              </div>
              <div>
                <Label>Full Address</Label>
                <Textarea value={form.address} onChange={e => updateField('address', e.target.value)} placeholder="Complete address..." rows={2} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              {(form.property_type === 'flat' || form.property_type === 'villa') && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>BHK</Label>
                      <Select value={form.bhk} onValueChange={v => updateField('bhk', v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {BHK_OPTIONS.map(b => <SelectItem key={b} value={String(b)}>{b} BHK</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Bedrooms</Label>
                      <Input type="number" value={form.bedrooms} onChange={e => updateField('bedrooms', e.target.value)} />
                    </div>
                    <div>
                      <Label>Bathrooms</Label>
                      <Input type="number" value={form.bathrooms} onChange={e => updateField('bathrooms', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Carpet Area (sq.ft)</Label>
                      <Input type="number" value={form.carpet_area} onChange={e => updateField('carpet_area', e.target.value)} />
                    </div>
                    <div>
                      <Label>Built-up Area (sq.ft)</Label>
                      <Input type="number" value={form.built_up_area} onChange={e => updateField('built_up_area', e.target.value)} />
                    </div>
                  </div>
                  {form.property_type === 'flat' && (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Floor Number</Label>
                        <Input type="number" value={form.floor_number} onChange={e => updateField('floor_number', e.target.value)} />
                      </div>
                      <div>
                        <Label>Total Floors</Label>
                        <Input type="number" value={form.total_floors} onChange={e => updateField('total_floors', e.target.value)} />
                      </div>
                      <div>
                        <Label>Furnishing</Label>
                        <Select value={form.furnishing} onValueChange={v => updateField('furnishing', v)}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {FURNISHING_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  {form.property_type === 'villa' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Plot Area (sq.ft)</Label>
                        <Input type="number" value={form.plot_area} onChange={e => updateField('plot_area', e.target.value)} />
                      </div>
                      <div>
                        <Label>Total Floors</Label>
                        <Input type="number" value={form.total_floors} onChange={e => updateField('total_floors', e.target.value)} />
                      </div>
                    </div>
                  )}
                </>
              )}

              {form.property_type === 'plot' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Plot Area (sq.ft)</Label>
                      <Input type="number" value={form.plot_area} onChange={e => updateField('plot_area', e.target.value)} />
                    </div>
                    <div>
                      <Label>Plot Dimensions</Label>
                      <Input value={form.plot_dimensions} onChange={e => updateField('plot_dimensions', e.target.value)} placeholder="e.g., 30x40" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Land Type</Label>
                      <Select value={form.land_type} onValueChange={v => updateField('land_type', v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="na">NA (Non-Agricultural)</SelectItem>
                          <SelectItem value="agricultural">Agricultural</SelectItem>
                          <SelectItem value="residential">Residential</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                      <Checkbox checked={form.boundary_wall} onCheckedChange={v => updateField('boundary_wall', v)} />
                      <Label>Boundary Wall</Label>
                    </div>
                  </div>
                </div>
              )}

              {form.property_type === 'commercial' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Commercial Type</Label>
                      <Select value={form.commercial_type} onValueChange={v => updateField('commercial_type', v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="shop">Shop</SelectItem>
                          <SelectItem value="office">Office</SelectItem>
                          <SelectItem value="warehouse">Warehouse</SelectItem>
                          <SelectItem value="showroom">Showroom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Carpet Area (sq.ft)</Label>
                      <Input type="number" value={form.carpet_area} onChange={e => updateField('carpet_area', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Floor Number</Label>
                      <Input type="number" value={form.floor_number} onChange={e => updateField('floor_number', e.target.value)} />
                    </div>
                    <div>
                      <Label>Parking Spots</Label>
                      <Input type="number" value={form.parking_spots} onChange={e => updateField('parking_spots', e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {/* Common specs */}
              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-medium text-muted-foreground mb-3">Common Details</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Facing</Label>
                    <Select value={form.facing} onValueChange={v => updateField('facing', v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {FACING_OPTIONS.map(f => <SelectItem key={f} value={f} className="capitalize">{f.replace('-', ' ')}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Possession</Label>
                    <Select value={form.possession_status} onValueChange={v => updateField('possession_status', v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ready">Ready to Move</SelectItem>
                        <SelectItem value="under_construction">Under Construction</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Property Age</Label>
                    <Input value={form.property_age} onChange={e => updateField('property_age', e.target.value)} placeholder="e.g., 2 years" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold">Amenities</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-3">
                  {AMENITIES_LIST.map(a => (
                    <label key={a} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors
                      ${form.amenities.includes(a) ? 'bg-primary/10 border-primary' : 'hover:bg-muted'}`}>
                      <Checkbox checked={form.amenities.includes(a)} onCheckedChange={() => toggleAmenity(a)} />
                      <span className="text-sm">{a}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label>RERA Number (optional)</Label>
                <Input value={form.rera_number} onChange={e => updateField('rera_number', e.target.value)} placeholder="e.g., P52100003XXX" />
              </div>
              <div>
                <Label>Description / Notes</Label>
                <Textarea value={form.description} onChange={e => updateField('description', e.target.value)} rows={5} placeholder="Add details about the property..." />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {!isEdit && (
                <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
                  💡 Please save the property first (as draft), then come back to edit and upload images or videos.
                </div>
              )}
              {isEdit && (
                <>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">Upload property images and videos for the public listing</p>
                    <input type="file" multiple accept="image/*,video/*,.mp4,.webm,.mov,.m4v" className="hidden" id="photo-upload"
                      onChange={e => handleImageUpload(e.target.files)} />
                    <Button variant="outline" onClick={() => document.getElementById('photo-upload')?.click()} disabled={uploading}>
                      {uploading ? 'Uploading...' : 'Upload Image/Video'}
                    </Button>
                  </div>
                  {images.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {images.map((img) => (
                        <div key={img.id} className="relative group rounded-lg overflow-hidden">
                          {isListingVideoUrl(img.image_url) ? (
                            <video src={img.image_url} className="w-full h-32 object-cover" muted playsInline controls preload="metadata" />
                          ) : (
                            <img src={img.image_url} alt="" className="w-full h-32 object-cover" />
                          )}
                          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                            <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => handleDeleteImage(img)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          {img.is_cover && (
                            <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                              <Star className="h-3 w-3 inline mr-1" />Cover
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="border-t pt-4">
                <Label>Publish Status</Label>
                <Select value={form.status} onValueChange={v => updateField('status', v)}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-4 border-t">
            <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(s => s + 1)}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={createProperty.isPending || updateProperty.isPending}>
                {isEdit ? 'Update Property' : 'Save Property'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
