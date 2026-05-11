import { ExternalLink, Car } from "lucide-react";

interface Props {
    lat: number;
    lng: number;
    type: "pickup" | "dropoff";
}

export function NavigationButtons({ lat, lng, type }: Props) {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

    return (
        <div className="flex gap-2 text-sm mt-3">
            <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-gray-100 py-2.5 rounded-lg font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
                <ExternalLink size={16} /> Maps
            </a>
            <a
                href={wazeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-blue-50 py-2.5 rounded-lg font-medium text-blue-700 hover:bg-blue-100 transition-colors"
            >
                <Car size={16} /> Waze
            </a>
        </div>
    );
}
