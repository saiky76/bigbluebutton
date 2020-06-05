import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import styles from './styles';
import Button from '../../../../button/component';
import Icon from '/imports/ui/components/icon/component';
import Auth from '/imports/ui/services/auth';
import { meetingIsBreakout, getParentMeetingId } from '/imports/ui/components/app/service';

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
  
  render() {
    const {
      text,
      file,
      id,
    } = this.props;

    // const ext = file.fileName.split('.').pop();
    return (
      <div className={(id == Auth.userID) ? styles.senderFileWrapper : styles.fileWrapper}>
        <div className={styles.wrapper}>
          <div className={styles.extensionBox}>
            <img src={`https://${window.document.location.hostname}/html5client/resources/images/File_Image.png`} alt="" />
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
