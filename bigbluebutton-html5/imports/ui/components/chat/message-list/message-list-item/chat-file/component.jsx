import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import styles from './styles';
import Button from '../../../../button/component';
import Icon from '/imports/ui/components/icon/component';
import Auth from '/imports/ui/services/auth';
// import { Document, Page, pdfjs ,Outline} from "react-pdf";
//import 'react-pdf/dist/Page/AnnotationLayer.css';
import { Document, Page, pdfjs ,Outline } from 'react-pdf/dist/entry.parcel';
// import { Document, Page, pdfjs, Outline  } from 'react-pdf/dist/entry.webpack';
// import pdfjs from "pdfjs-dist/webpack.js";
const propTypes = {
  text: PropTypes.string,
  file: PropTypes.object.isRequired,
};

export default class ChatFileUploaded extends PureComponent {
  constructor(props) {
    super(props);

    this.handleFileDownload = this.handleFileDownload.bind(this);
  }

  handleFileDownload() {
    const {
      file,
    } = this.props;
    
    const uri = `https://${window.document.location.hostname}/bigbluebutton/file/download/`
    + `${file.fileId}/${file.fileName}/${file.meetingId}`;
    
    window.open(uri);
  }
  componentDidMount() {
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;
  }
  render() {
    const {
      text,
      file,
      id,
    } = this.props;

    const uri = `https://${window.document.location.hostname}/bigbluebutton/file/download/`
      + `${file.fileId}/${file.fileName}/${file.meetingId}/`;

     const ext = file.fileName.split('.').pop();
    return (
      <div className={(id == Auth.userID) ? styles.senderFileWrapper : styles.fileWrapper}>
        <div className={styles.wrapper}>
           <div className={styles.extensionBox}>
              {ext=="png"  ? <img src={uri} alt="" /> :
           
           <Document className={styles.extension}  file = {{url: uri, pdf:uri, withCredentials:true}}  inputRef={uri} 
           onSourceError={(error) => alert('Error while retrieving document source! ' + error.message)}
           error={(error) => alert('Error while retrieving document source! ' + error.message)}
           onSourceError={(error) => alert('Error while retrieving document source! ' + error.message)}
           >
             <Page pageNumber={1} file = {{url: uri}} pdf={uri} />
             <Outline file = {{url: uri}} pdf={uri}/>
           </Document>
                //  <object data={uri}  width="40" height="40" >
                //  {/* <a href={uri}>test.pdf</a> */}
                //  </object>
           }
          
            {/* <embed src={uri}  /> */}
            {/* <iframe src={uri} ></iframe> */}
          </div>          
          <span className={styles.fileName}>{file.fileName}</span>
          <Button
            hideLabel
            label="Download"
            className={styles.button}
            color="default"
            icon="template_download"
            size="lg"
            circle
            onClick={() => this.handleFileDownload()}
          />
        </div>
        {(text) ? (
          <p
            ref={(ref) => { this.text = ref; }}
            dangerouslySetInnerHTML={{ __html: text }}
            className={styles.text}
          />
        ) : null}
      </div>
    );
  }

}

ChatFileUploaded.propTypes = propTypes;