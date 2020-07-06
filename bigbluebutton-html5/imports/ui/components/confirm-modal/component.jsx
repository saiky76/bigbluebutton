import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Modal from '/imports/ui/components/modal/simple/component';
import { injectIntl } from 'react-intl';
import { styles } from './styles';

const propTypes = {
  users: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const defaultProps = {
};

class ConfirmModalComponent extends Component {
  constructor(props) {
    super(props);
    this.confirm = this.confirm.bind(this);
  }
confirm(){
    window.close()
}
  render() {
    const {
      closeModal,
    } = this.props;
    return (
      <span>
        <Modal
          overlayClassName={styles.overlay}
          className={styles.modal}
          onRequestClose={closeModal}
          hideBorder
        >
          <React.Fragment>
         <div> Are you sure you want to leave this workspace?</div>
          <button onClick={this.confirm} className={styles.btn} > confirm </button>
          </React.Fragment>
        </Modal>
      </span>
    );
  }
}

ConfirmModalComponent.propTypes = propTypes;
ConfirmModalComponent.defaultProps = defaultProps;

export default injectIntl(ConfirmModalComponent);
