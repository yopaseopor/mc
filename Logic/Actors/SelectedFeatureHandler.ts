import {UIEventSource} from "../UIEventSource";
import FeatureSource from "../FeatureSource/FeatureSource";
import {OsmObject, OsmObjectMeta} from "../Osm/OsmObject";
import Loc from "../../Models/Loc";
import FeaturePipeline from "../FeatureSource/FeaturePipeline";
import OsmApiFeatureSource from "../FeatureSource/OsmApiFeatureSource";

/**
 * Makes sure the hash shows the selected element and vice-versa.
 */
export default class SelectedFeatureHandler {
    private readonly _featureSource: FeatureSource;
    private readonly _hash: UIEventSource<string>;
    private readonly _selectedFeature: UIEventSource<any>;

    private static readonly _no_trigger_on = ["welcome","copyright","layers"]
    private readonly _osmApiSource: OsmApiFeatureSource;
    
    constructor(hash: UIEventSource<string>, 
                selectedFeature: UIEventSource<any>,
                featureSource: FeaturePipeline,
                osmApiSource: OsmApiFeatureSource) {
        this._hash = hash;
        this._selectedFeature = selectedFeature;
        this._featureSource = featureSource;
        this._osmApiSource = osmApiSource;
        const self = this;
        hash.addCallback(h => {
            if (h === undefined || h === "") {
                selectedFeature.setData(undefined);
            }else{
                self.selectFeature();
            }
        })
        
        hash.addCallbackAndRun(h => self.downloadFeature(h))
        
        featureSource.features.addCallback(_ => self.selectFeature());

        selectedFeature.addCallback(feature => {
            if(feature === undefined){
                if(SelectedFeatureHandler._no_trigger_on.indexOf(hash.data) < 0){
                    hash.setData("")
                }
            }
            
            const h = feature?.properties?.id;
            if(h !== undefined){
                hash.setData(h)
            }
        })

        this.selectFeature();

    }
    
    // If a feature is selected via the hash, zoom there
    public zoomToSelectedFeature(location: UIEventSource<Loc>){
        const hash = this._hash.data;
        if(hash === undefined || SelectedFeatureHandler._no_trigger_on.indexOf(hash) >= 0){
            return; // No valid feature selected
        }
        // We should have a valid osm-ID and zoom to it
        OsmObject.DownloadObject(hash, (element: OsmObject, meta: OsmObjectMeta) => {
            const centerpoint = element.centerpoint();
            console.log("Zooming to location for select point: ", centerpoint)
            location.data.lat = centerpoint[0]
            location.data.lon = centerpoint[1]
            location.ping();
        })
    }
    
    private downloadFeature(hash:  string){
        if(hash === undefined || hash === ""){
            return;
        }
        if(SelectedFeatureHandler._no_trigger_on.indexOf(hash) >= 0){
            return;
        }
       this._osmApiSource.load(hash)
    }
    
    private selectFeature(){
        const features = this._featureSource?.features?.data;
        if(features === undefined){
            return;
        }
        if(this._selectedFeature.data?.properties?.id === this._hash.data){
            // Feature already selected
            return;
        }
        
        const hash = this._hash.data;
        if(hash === undefined || hash === "" || hash === "#"){
            return;
        }
        for (const feature of features) {
            const id = feature.feature?.properties?.id;
            if(id === hash){
                this._selectedFeature.setData(feature.feature);
                break;
            }
        }
    }

}