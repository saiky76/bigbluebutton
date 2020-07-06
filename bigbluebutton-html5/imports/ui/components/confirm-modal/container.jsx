import React from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import { withModalMounter } from '/imports/ui/components/modal/service';

import ConfirmModalComponent  from './component';

const ConfirmModalContainer = props => <ConfirmModalComponent {...props} />;

export default withModalMounter(withTracker(({ mountModal }) => {
  return ({
    closeModal: () => { mountModal(null); },
  });
})(ConfirmModalContainer));